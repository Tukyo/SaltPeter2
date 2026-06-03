import type { BrushShape } from './BrushTypes';
import type { Color } from '../definitions/Primitives';
import type { MaterialId, MaterialOccupancy } from '../materials/definitions/MaterialIdentity';
import type { SimulationLayer } from '../simulation/SimulationLayer';

import { BrushPass } from '../simulation/BrushPass';
import { BrushState } from './BrushState';
import { Camera } from '../camera/Camera';
import { Input } from '../input/Input';
import { LogManager } from '../debug/LogManager';
import { MaterialRegistry } from '../materials/MaterialRegistry';
import { NitrateProcess } from '../NitrateProcess';
import { Renderer } from '../rendering/Renderer';
import { SceneManager } from '../scene/SceneManager';
import { SimulationConfig } from '../config/SimulationConfig';
import { SimulationManager } from '../simulation/SimulationManager';
import { World } from '../world/World';
import { WorldConfig } from '../config/WorldConfig';

/** Manages the brush and all brush-related processes. */
export class BrushManager extends NitrateProcess {
    public static Instance: BrushManager | null = null;

    public readonly state: BrushState = new BrushState();

    private device: GPUDevice | null = null;
    private brushPass: BrushPass | null = null;
    private simulationLayer: SimulationLayer | null = null;

    private blocked: boolean = false;
    private simTime: number = 0;
    private lastUpdateTime: number | null = null;
    private brushAccumulator: number = 0;

    public onPaletteChange: ((colors: Color[]) => void) | null = null;
    private readonly onSimInit: () => Promise<void>;

    constructor() {
        super();
        BrushManager.Instance = this;
        this.onSimInit = async () => {
            if (BrushManager.Instance !== this) { return; }
            await this.Init();
            this.SetMaterial(this.state.GetMaterialId());
        };
        NitrateProcess.OnInit(SimulationManager, this.onSimInit);
    }

    /** Returns the current shape of the brush as a number. */
    public static ShapeIndex(shape: BrushShape): number { return shape === 'square' ? 1 : 0; }

    /**
     * Prevents brush strokes from being applied.
     * 
     * Useful for scenarios like when you need to capture mouse input for other purposes (e.g. drawing a bounding box or placing an anchor).
     */
    public Block(): void { this.blocked = true; }
    
    /** Restores normal brush painting after a {@link Block} call. */
    public Unblock(): void { this.blocked = false; }

    public Update(now: number): void {
        const mouse = Input.Instance?.GetState();
        const canvas = Renderer.Instance?.GetWebGPU()?.canvas;
        const simulationLayer = SimulationManager.Instance?.simulationLayer;
        if (!mouse || !canvas || !simulationLayer) { return; }

        const config = SimulationConfig.GetConfig();
        const time = now * 0.001;
        if (this.lastUpdateTime === null) { this.lastUpdateTime = time; return; }
        const dt = Math.min(Math.max(0, time - this.lastUpdateTime), config.time.maxDeltaTime);
        this.lastUpdateTime = time;

        const mouseActive = mouse.leftDown && mouse.isInside && !this.blocked;
        if (!mouseActive) { this.brushAccumulator = 0; return; }

        this.brushAccumulator = Math.min(
            this.brushAccumulator + dt * config.time.baseTickRate,
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
        const camX = Camera.Instance?.GetCameraPos().x ?? 0;
        const camY = Camera.Instance?.GetCameraPos().y ?? 0;
        const simX = margin + (mouse.pos.x + camX) * contentW / canvas.width;
        const simY = margin + (mouse.pos.y - camY) * contentH / canvas.height;
        for (let i = 0; i < steps; i++) {
            this.simTime += 1 / config.time.baseTickRate;
            this.Apply(simX, simY, this.simTime);
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
    public SetOccupancy(value: MaterialOccupancy): void {
        this.state.SetOccupancy(value);
    }

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

    private Apply(simX: number, simY: number, simTime: number): void {
        if (!this.device || !this.brushPass || !this.simulationLayer) { return; }
        const { state } = this;
        const materialId = state.GetMode() === 'erase' ? 0 : state.GetMaterialId();
        if (!SceneManager.IsDirty() && materialId !== 0) { SceneManager.MarkDirty(); }

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
            brushType: state.GetType() === 'palette' ? 1 : 0,
            variantId: state.GetVariantId(),
            occupancy: state.GetOccupancy() === 'static' ? 2 : 1,
        });
        this.device.queue.submit([enc.finish()]);
        this.simulationLayer.SwapIdentity();
        this.simulationLayer.SwapPhysics();
        this.simulationLayer.SwapState();
    }

    public OnDestroy(): void {
        NitrateProcess.RemoveInitListener(SimulationManager, this.onSimInit);
        this.onPaletteChange = null;

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
