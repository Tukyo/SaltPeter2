import type { BrushMode, BrushShape, BrushType } from './BrushTypes';
import type { Color } from '../definitions/Primitives';
import type { MaterialId, MaterialOccupancy } from '../materials/definitions/MaterialIdentity';
import type { SimulationLayer } from '../simulation/SimulationLayer';

import { BrushPass } from '../simulation/BrushPass';
import { BrushState } from './BrushState';
import { Camera } from '../component/definitions/camera/Camera';
import { Transform } from '../component/definitions/transform/Transform';
import { Input } from '../input/Input';
import { LogManager } from '../debug/LogManager';
import { MaterialRegistry } from '../materials/MaterialRegistry';
import { NitrateProcess } from '../NitrateProcess';
import { Renderer } from '../rendering/Renderer';
import { SceneManager } from '../scene/SceneManager';
import { SimulationConfig } from '../config/SimulationConfig';
import { SimulationManager } from '../simulation/SimulationManager';
import { Time } from '../time/Time';
import { World } from '../world/World';
import { WorldConfig } from '../config/WorldConfig';

/** 
 * Manages the brush and all brush-related processes.
 *
 * ```
 * new Nitrate.BrushManager();
 * ``` 
 */
export class BrushManager extends NitrateProcess {
    public static Instance: BrushManager | null = null;

    public readonly state: BrushState = new BrushState();

    private device: GPUDevice | null = null;
    private brushPass: BrushPass | null = null;
    private simulationLayer: SimulationLayer | null = null;

    private marginSize: number = 0;
    private simTime: number = 0;
    private brushAccumulator: number = 0;

    public onPaletteChange: ((colors: Color[]) => void) | null = null;
    public onFirstPaint: (() => void) | null = null;
    private readonly onSimInit: () => Promise<void>;

    constructor() {
        super();
        this.Register();
        
        BrushManager.Instance = this;
        this.onSimInit = async () => {
            if (BrushManager.Instance !== this) { return; }
            await this.Init();
            this.SetMaterial(this.state.GetMaterialId());
        };
        NitrateProcess.OnInit(SimulationManager, this.onSimInit);
    }

    /** Returns the current shape of the brush as a number. */
    private static ShapeIndex(shape: BrushShape): number { return shape === 'square' ? 1 : 0; }

    /** Returns the current type of the brush as a number. */
    private static TypeIndex(type: BrushType): number {
        const map: Record<BrushType, number> = {
            noise: 0,
            palette: 1,
            scatter: 2,
            boxes: 3,
            stripes: 4,
            circles: 5
        };
        return map[type];
    }

    /** Returns the current mode of the brush as a number. */
    private static ModeIndex(mode: BrushMode): number {
        const map: Record<BrushMode, number> = {
            fill: 0,
            mask: 1,
            overlay: 2
        };
        return map[mode];
    }

    /** Sets the number of margin cells the brush shader will refuse to write. Pass 0 to disable. */
    public SetMarginSize(size: number): void { this.marginSize = size; }

    public Update(): void {
        const mouse = Input.Instance?.GetMouseState();
        const canvas = Renderer.Instance?.GetWebGPU()?.canvas;
        const simulationLayer = SimulationManager.Instance?.simulationLayer;
        if (!mouse || !canvas || !simulationLayer) { return; }

        const config = SimulationConfig.GetConfig();
        const deltaTime = Math.min(Time.deltaTime, config.time.maxDeltaTime);

        const mouseActive = (mouse.leftDown || mouse.rightDown) && mouse.canvas.isInside;
        if (!mouseActive) { this.brushAccumulator = 0; return; }

        this.brushAccumulator = Math.min(
            this.brushAccumulator + deltaTime * config.time.baseTickRate,
            config.performance.maxAccumulatedSteps
        );
        const steps = Math.floor(this.brushAccumulator);
        if (steps <= 0) { return; }

        this.brushAccumulator = Math.max(0, this.brushAccumulator - steps);
        const margin = World.Instance
            ? WorldConfig.GetConfig().chunk.margin * WorldConfig.GetConfig().chunk.size
            : 0;
        const contentW = simulationLayer.width - 2 * margin;
        const contentH = simulationLayer.height - 2 * margin;
        const camPos = Camera.Main?.gameObject?.GetComponent(Transform)?.position;
        const simOrigin = World.Instance?.GetSimOrigin() ?? { x: 0, y: 0 };
        const camOriginX = camPos ? (camPos.x - simOrigin.x) - contentW / 2 : margin;
        const camOriginY = camPos ? (camPos.y - simOrigin.y) - contentH / 2 : margin;
        const simX = camOriginX + mouse.canvas.pos.x * contentW / canvas.width;
        const simY = camOriginY + mouse.canvas.pos.y * contentH / canvas.height;
        const isErase = mouse.rightDown;
        for (let i = 0; i < steps; i++) {
            this.simTime += 1 / config.time.baseTickRate;
            this.Apply(simX, simY, this.simTime, isErase);
        }
    }

    private async Init(): Promise<void> {
        const device = Renderer.Instance?.GetWebGPU()?.device;
        const { simulationLayer, materialPhysicsBuffer, materialStateBuffer } = SimulationManager.Instance ?? {};
        if (!device || !simulationLayer || !materialPhysicsBuffer || !materialStateBuffer) { return; }

        this.device = device;
        this.simulationLayer = simulationLayer;
        this.brushPass = await BrushPass.Create({
            device,
            simulationLayer,
            physicsBuffer: materialPhysicsBuffer,
            stateBuffer: materialStateBuffer,
        });
    }

    /** Sets the current active material for the brush. */
    public SetMaterial(id: MaterialId): void {
        this.state.SetMaterialId(id);
        this.state.SetVariantId(0);
        const material = Object.values(MaterialRegistry.Materials).find(m => m.id === id) ?? null;
        if (material) {
            this.state.SetPaletteColors([...material.colors]);
            this.onPaletteChange?.([...material.colors]);
        }
    }

    /** Sets whether cells placed by the brush are dynamic (simulated) or static (bypasses sim). */
    public SetOccupancy(value: MaterialOccupancy): void { this.state.SetOccupancy(value); }

    /** Sets the current variant for the brush when the active material has any variants. */
    public SetVariant(variantId: number): void {
        const materialId = this.state.GetMaterialId();
        const material = Object.values(MaterialRegistry.Materials).find(m => m.id === materialId) ?? null;
        if (!material) { return; }
        const variant = variantId === 0 ? null : (material.variants?.find(v => v.id === variantId) ?? null);
        const colors = variant ? [...variant.colors] : [...material.colors];
        this.state.SetVariantId(variantId);
        this.state.SetPaletteColors(colors);
        this.onPaletteChange?.(colors);
    }

    /** Dispatches a single brush GPU pass at the given simulation-space coordinates. */
    private Apply(simX: number, simY: number, simTime: number, isErase: boolean): void {
        if (!this.device || !this.brushPass || !this.simulationLayer) { return; }
        const { state } = this;
        const materialId = state.GetMaterialId();
        if (!SceneManager.IsDirty() && materialId !== 0) { SceneManager.MarkDirty(); }
        if (this.onFirstPaint && materialId !== 0) { this.onFirstPaint(); }

        const raw = state.GetColorWeights();
        const weightTotal = raw[0] + raw[1] + raw[2] + raw[3];
        const weightScale = weightTotal > 0 ? 1 / weightTotal : 0.25;

        const enc = this.device.createCommandEncoder();
        this.brushPass.Run({
            encoder: enc,
            mouseX: simX,
            mouseY: simY,
            materialId,
            radius: state.GetSize(),
            density: state.GetDensity(),
            time: simTime,
            snap: state.GetSnap(),
            shape: BrushManager.ShapeIndex(state.GetShape()),
            colorVariant: state.GetColor(),
            brushType: BrushManager.TypeIndex(state.GetType()),
            variantId: state.GetVariantId(),
            occupancy: state.GetOccupancy() === 'static' ? 2 : 1,
            paintMode: BrushManager.ModeIndex(state.GetMode()),
            marginSize: this.marginSize,
            colorWeight0: raw[0] * weightScale,
            colorWeight1: raw[1] * weightScale,
            colorWeight2: raw[2] * weightScale,
            colorWeight3: raw[3] * weightScale,
            stripeAngle: state.GetStripeAngle() * (Math.PI / 180),
            stripeWidth: state.GetStripeWidth(),
            overlayFilter: state.GetOverlayFilter() ? 1 : 0,
            isErase: isErase ? 1 : 0,
        });
        this.device.queue.submit([enc.finish()]);
        this.simulationLayer.SwapIdentity();
        this.simulationLayer.SwapPhysics();
        this.simulationLayer.SwapState();
    }

    public OnDestroy(): void {
        NitrateProcess.RemoveInitListener(SimulationManager, this.onSimInit);
        this.onPaletteChange = null;
        this.onFirstPaint = null;

        this.brushPass?.Destroy();
        this.brushPass = null;

        this.simulationLayer = null;
        this.device = null;

        if (BrushManager.Instance === this) {
            BrushManager.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared BrushManager singleton instance.',
                options: { tags: ["Brush", "NitrateProcessDestroy"] }
            });
        }
    }
}
