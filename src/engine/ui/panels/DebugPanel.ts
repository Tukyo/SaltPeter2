import type { PingPongTargets } from '../../simulation/PingPongTargets';
import type { TexturePixelReader } from '../../rendering/TexturePixelReader';

import { Camera } from '../../camera/Camera';
import { CollapsiblePanel } from '../CollapsiblePanel'
import { Input } from '../../input/Input';
import { MaterialRegistry } from '../../materials/MaterialRegistry';
import { NitrateProcess } from '../../NitrateProcess';
import { Renderer } from '../../rendering/Renderer';
import { SimulationManager } from '../../simulation/SimulationManager';
import { UserInterfaceManager } from '../UserInterfaceManager';
import { Utils } from '../../utility/Utils';
import { World } from '../../world/World';
import { WorldConfig } from '../../config/WorldConfig';

interface FrameStats {
    simulationSteps: number;
    physicsSteps: number;
}

interface SetHoveredCellParams {
    id: number;
    name: string;
    variantName: string;
    occupancy: number;
    health: number;
    lifetime: number;
    temp: number;
    pressure: number;
    velocityX: number;
    velocityY: number;
    tags: readonly string[];
}

interface ReadHoveredCellParams {
    cellX: number;
    cellY: number;
    version: number;
    pingPong: PingPongTargets;
    texturePixelReader: TexturePixelReader;
}

/** 
 * Debug overlay panel.
 * 
 * Tracks FPS, frame time, simulation/physics step counts, and hovered cell material data via GPU texture readback.
 * Collapsed by default.
 * 
 * ```ts
 * new Nitrate.DebugPanel();
 * ```
 */
export class DebugPanel extends NitrateProcess {
    private static readonly FpsSampleWindowMs = 250;
    private static readonly FpsResetThresholdMs = 1000;
    private static readonly HoveredCellSampleIntervalMs = 100;

    private readonly panel: CollapsiblePanel;
    private readonly fpsValue: HTMLSpanElement;
    private readonly frameTimeValue: HTMLSpanElement;
    private readonly simStepsValue: HTMLSpanElement;
    private readonly physicsStepsValue: HTMLSpanElement;
    private readonly advancedToggle: HTMLInputElement;
    private readonly advancedContent: HTMLDivElement;
    private readonly hoveredIdValue: HTMLSpanElement;
    private readonly hoveredNameValue: HTMLSpanElement;
    private readonly hoveredVariantValue: HTMLSpanElement;
    private readonly hoveredOccupancyValue: HTMLSpanElement;
    private readonly hoveredHealthValue: HTMLSpanElement;
    private readonly hoveredLifetimeValue: HTMLSpanElement;
    private readonly hoveredTempValue: HTMLSpanElement;
    private readonly hoveredPressureValue: HTMLSpanElement;
    private readonly hoveredVelocityValue: HTMLSpanElement;
    private readonly hoveredTagsContainer: HTMLDivElement;

    private lastFrameTimeMs: number | null = null;
    private fpsSampleElapsedMs: number = 0;
    private fpsSampleFrames: number = 0;
    private lastFpsText: string = '';
    private lastFrameTimeText: string = '';
    private lastSimStepsText: string = '';
    private lastPhysicsStepsText: string = '';

    private lastHoveredSampleTimeMs: number = -DebugPanel.HoveredCellSampleIntervalMs;
    private lastHoveredCellKey: string | null = null;
    private hoveredReadPending: boolean = false;
    private hoveredReadVersion: number = 0;
    private lastPingPong: PingPongTargets | null = null;

    constructor() {
        super();
        this.panel = new CollapsiblePanel({
            label: 'Debug',
            parent: UserInterfaceManager.Instance?.toolsDocket as HTMLElement,
            defaultCollapsed: true
        });
        const container = this.panel.body;

        const section = document.createElement('section');
        section.className = 'panel-section';

        const title = document.createElement('h3');
        title.textContent = 'Performance';
        section.appendChild(title);

        this.fpsValue = this.AppendStatRow(section, 'FPS');
        this.frameTimeValue = this.AppendStatRow(section, 'Frame Time');
        this.simStepsValue = this.AppendStatRow(section, 'Sim Steps');
        this.physicsStepsValue = this.AppendStatRow(section, 'Physics Steps');

        container.appendChild(section);

        const advancedSection = document.createElement('section');
        advancedSection.className = 'panel-section';

        this.advancedToggle = this.AppendToggleRow(advancedSection, 'Advanced');
        this.advancedContent = document.createElement('div');
        this.advancedContent.className = 'debug-advanced-content';

        const hoveredTitle = document.createElement('h3');
        hoveredTitle.textContent = 'Hovered Cell';
        this.advancedContent.appendChild(hoveredTitle);

        this.AppendLabelRow(this.advancedContent, 'Identity');
        this.hoveredIdValue = this.AppendSubStatRow(this.advancedContent, 'ID');
        this.hoveredNameValue = this.AppendSubStatRow(this.advancedContent, 'Name');
        this.hoveredVariantValue = this.AppendSubStatRow(this.advancedContent, 'Variant');
        this.hoveredOccupancyValue = this.AppendSubStatRow(this.advancedContent, 'Occupancy');

        this.AppendLabelRow(this.advancedContent, 'State');
        this.hoveredHealthValue = this.AppendSubStatRow(this.advancedContent, 'Health');
        this.hoveredLifetimeValue = this.AppendSubStatRow(this.advancedContent, 'Lifetime');

        this.AppendLabelRow(this.advancedContent, 'Physics');
        this.hoveredTempValue = this.AppendSubStatRow(this.advancedContent, 'Temp');
        this.hoveredPressureValue = this.AppendSubStatRow(this.advancedContent, 'Pressure');
        this.hoveredVelocityValue = this.AppendSubStatRow(this.advancedContent, 'Velocity');

        this.AppendLabelRow(this.advancedContent, 'Tags');
        this.hoveredTagsContainer = document.createElement('div');
        this.hoveredTagsContainer.className = 'debug-tags-container';
        this.advancedContent.appendChild(this.hoveredTagsContainer);

        advancedSection.appendChild(this.advancedContent);
        this.advancedToggle.addEventListener('change', () => { this.SyncAdvancedVisibility(); });
        this.SyncAdvancedVisibility();

        container.appendChild(advancedSection);
    }

    public Update(now: number): void {
        const mouse = Input.Instance?.GetState();
        const sim = SimulationManager.Instance;
        const renderer = Renderer.Instance?.GetWebGPU();
        const pingPong = sim?.pingPong ?? null;
        const texturePixelReader = sim?.texturePixelReader ?? null;
        const canvasWidth = renderer?.canvas.width ?? 1;
        const canvasHeight = renderer?.canvas.height ?? 1;
        const stats: FrameStats = {
            simulationSteps: sim?.state.GetLastTickSimulationSteps() ?? 0,
            physicsSteps: sim?.state.GetLastTickPhysicsSteps() ?? 0,
        };

        if (pingPong !== null && pingPong !== this.lastPingPong) {
            this.lastPingPong = pingPong;
            this.Reset();
        }
        this.RecordFrame(now, stats);
        if (!pingPong || !texturePixelReader) { return; }

        if (!this.IsAdvancedEnabled()) {
            this.hoveredReadVersion++;
            this.lastHoveredCellKey = null;
            this.ClearHoveredCellInfo();
            return;
        }

        if (!mouse || !mouse.isInside) {
            this.lastHoveredCellKey = null;
            this.ClearHoveredCellInfo();
            return;
        }

        let cellX: number;
        let cellY: number;

        if (World.Instance) {
            const { chunk } = WorldConfig.GetConfig();
            const margin = chunk.margin * chunk.size;
            const contentW = pingPong.width - 2 * margin;
            const contentH = pingPong.height - 2 * margin;
            const cam = Camera.Instance?.GetCameraPos() ?? { x: 0, y: 0 };
            cellX = Math.floor(margin + (cam.x + mouse.pos.x) * contentW / Math.max(1, canvasWidth));
            cellY = Math.floor(margin + (mouse.pos.y - cam.y) * contentH / Math.max(1, canvasHeight));
        } else {
            cellX = Math.floor(mouse.pos.x * (pingPong.width / Math.max(1, canvasWidth)));
            cellY = Math.floor(mouse.pos.y * (pingPong.height / Math.max(1, canvasHeight)));
        }

        cellX = Utils.Clamp(cellX, 0, pingPong.width - 1);
        cellY = Utils.Clamp(cellY, 0, pingPong.height - 1);
        const cellKey = cellX + ',' + cellY;
        const cellChanged = cellKey !== this.lastHoveredCellKey;
        const sampleDue = now - this.lastHoveredSampleTimeMs >= DebugPanel.HoveredCellSampleIntervalMs;

        if (!cellChanged && !sampleDue) { return; }
        if (this.hoveredReadPending) { return; }

        this.lastHoveredCellKey = cellKey;
        this.lastHoveredSampleTimeMs = now;
        this.hoveredReadPending = true;
        const version = ++this.hoveredReadVersion;

        void this.ReadHoveredCell({ cellX, cellY, version, pingPong, texturePixelReader });
    }

    private AppendStatRow(section: HTMLElement, label: string): HTMLSpanElement {
        const row = document.createElement('div');
        row.className = 'control-label-row debug-stat-row';

        const lbl = document.createElement('span');
        lbl.className = 'debug-stat-label';
        lbl.textContent = label;

        const val = document.createElement('span');
        val.className = 'control-value debug-stat-value';
        val.textContent = '--';

        row.appendChild(lbl);
        row.appendChild(val);
        section.appendChild(row);
        return val;
    }

    private AppendLabelRow(section: HTMLElement, label: string): void {
        const lbl = document.createElement('span');
        lbl.className = 'debug-section-label';
        lbl.textContent = label;
        section.appendChild(lbl);
    }

    private AppendSubStatRow(section: HTMLElement, label: string): HTMLSpanElement {
        const row = document.createElement('div');
        row.className = 'control-label-row debug-stat-row debug-sub-stat-row';

        const lbl = document.createElement('span');
        lbl.className = 'debug-stat-label';
        lbl.textContent = label;

        const val = document.createElement('span');
        val.className = 'control-value debug-stat-value';
        val.textContent = '--';

        row.appendChild(lbl);
        row.appendChild(val);
        section.appendChild(row);
        return val;
    }

    private AppendToggleRow(section: HTMLElement, label: string): HTMLInputElement {
        const row = document.createElement('div');
        row.className = 'control-label-row debug-stat-row';

        const lbl = document.createElement('span');
        lbl.className = 'debug-stat-label';
        lbl.textContent = label;

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.className = 'debug-toggle-checkbox';
        toggle.checked = false;

        row.appendChild(lbl);
        row.appendChild(toggle);
        section.appendChild(row);

        return toggle;
    }

    private RecordFrame(nowMs: number, stats: FrameStats): void {
        this.SetSimSteps(stats.simulationSteps);
        this.SetPhysicsSteps(stats.physicsSteps);

        if (this.lastFrameTimeMs === null) {
            this.lastFrameTimeMs = nowMs;
            return;
        }

        const deltaMs = nowMs - this.lastFrameTimeMs;
        this.lastFrameTimeMs = nowMs;

        this.SetFrameTime(deltaMs);

        if (deltaMs <= 0 || deltaMs > DebugPanel.FpsResetThresholdMs) {
            this.fpsSampleElapsedMs = 0;
            this.fpsSampleFrames = 0;
            return;
        }

        this.fpsSampleElapsedMs += deltaMs;
        this.fpsSampleFrames += 1;

        if (this.fpsSampleElapsedMs < DebugPanel.FpsSampleWindowMs) { return; }

        this.SetFps((this.fpsSampleFrames * 1000.0) / this.fpsSampleElapsedMs);
        this.fpsSampleElapsedMs = 0;
        this.fpsSampleFrames = 0;
    }

    private SetFps(fps: number): void {
        const text = fps.toFixed(1);
        if (text === this.lastFpsText) { return; }
        this.fpsValue.textContent = text;
        this.lastFpsText = text;
    }

    private SetFrameTime(ms: number): void {
        const text = ms.toFixed(1) + ' ms';
        if (text === this.lastFrameTimeText) { return; }
        this.frameTimeValue.textContent = text;
        this.lastFrameTimeText = text;
    }

    private SetSimSteps(steps: number): void {
        const text = String(steps);
        if (text === this.lastSimStepsText) { return; }
        this.simStepsValue.textContent = text;
        this.lastSimStepsText = text;
    }

    private SetPhysicsSteps(steps: number): void {
        const text = String(steps);
        if (text === this.lastPhysicsStepsText) { return; }
        this.physicsStepsValue.textContent = text;
        this.lastPhysicsStepsText = text;
    }

    /** Returns whether the Advanced section toggle is currently toggled. @internal */
    public IsAdvancedEnabled(): boolean {
        return this.advancedToggle.checked;
    }

    /** Populates the hovered cell display with decoded material and physics data. @internal */
    public SetHoveredCellInfo(params: SetHoveredCellParams): void {
        const { id, name, variantName, occupancy, health, lifetime, temp, pressure, velocityX, velocityY, tags } = params;
        this.hoveredIdValue.textContent = String(id);
        this.hoveredNameValue.textContent = name;
        this.hoveredVariantValue.textContent = variantName;
        this.hoveredOccupancyValue.textContent = String(occupancy);
        this.hoveredHealthValue.textContent = Utils.FormatDecimal(health, 7);
        this.hoveredLifetimeValue.textContent = Utils.FormatDecimal(lifetime, 7);
        this.hoveredTempValue.textContent = Utils.FormatDecimal(temp, 4);
        this.hoveredPressureValue.textContent = Utils.FormatDecimal(pressure, 4);
        this.hoveredVelocityValue.textContent = `${Utils.FormatDecimal(velocityX, 3)}, ${Utils.FormatDecimal(velocityY, 3)}`;

        this.hoveredTagsContainer.innerHTML = '';
        for (const tag of tags) {
            const chip = document.createElement('span');
            chip.className = 'debug-tag-chip';
            chip.textContent = tag;
            this.hoveredTagsContainer.appendChild(chip);
        }
    }

    /** Resets all hovered cell display fields to '--'. @internal */
    public ClearHoveredCellInfo(): void {
        this.hoveredIdValue.textContent = '--';
        this.hoveredNameValue.textContent = '--';
        this.hoveredVariantValue.textContent = '--';
        this.hoveredOccupancyValue.textContent = '--';
        this.hoveredHealthValue.textContent = '--';
        this.hoveredLifetimeValue.textContent = '--';
        this.hoveredTempValue.textContent = '--';
        this.hoveredPressureValue.textContent = '--';
        this.hoveredVelocityValue.textContent = '--';
        this.hoveredTagsContainer.innerHTML = '';
    }

    private SyncAdvancedVisibility(): void {
        this.advancedContent.classList.toggle('is-visible', this.advancedToggle.checked);
    }

    private async ReadHoveredCell(params: ReadHoveredCellParams): Promise<void> {
        const { cellX, cellY, version, pingPong, texturePixelReader } = params;
        try {
            const statePixel = await texturePixelReader.ReadPixel(
                { texture: pingPong.currentIdentity, pos: { x: cellX, y: cellY }, format: 'rgba8unorm' }
            );
            if (!this.ShouldApplyHoveredRead(version)) { return; }

            const materialId = statePixel[0];
            const material = Object.values(MaterialRegistry.Materials).find(e => e.id === materialId) ?? null;

            const physicsPixel = await texturePixelReader.ReadPixel(
                { texture: pingPong.currentPhysics, pos: { x: cellX, y: cellY }, format: 'rgba32float' }
            );
            const cellStatePixel = await texturePixelReader.ReadPixel(
                { texture: pingPong.currentState, pos: { x: cellX, y: cellY }, format: 'rgba32float' }
            );

            if (!this.ShouldApplyHoveredRead(version)) { return; }

            const resolvedMaterial = material ?? MaterialRegistry.Materials.air;
            const materialName = resolvedMaterial.name.charAt(0).toUpperCase() + resolvedMaterial.name.slice(1);
            const maxHealth = resolvedMaterial.state?.health ?? 0;
            const maxLifetime = resolvedMaterial.state?.lifetime ?? 0;
            const variantId = statePixel[2];
            const rawVariantName = resolvedMaterial.variants?.find(v => v.id === variantId)?.name ?? 'default';
            const variantName = rawVariantName.charAt(0).toUpperCase() + rawVariantName.slice(1);

            this.SetHoveredCellInfo({
                id: resolvedMaterial.id,
                name: materialName,
                variantName,
                occupancy: statePixel[3],
                health: cellStatePixel[0] * maxHealth,
                lifetime: cellStatePixel[1] * maxLifetime,
                temp: physicsPixel[0],
                pressure: physicsPixel[1],
                velocityX: physicsPixel[2],
                velocityY: physicsPixel[3],
                tags: resolvedMaterial.tags ?? [],
            });
        } catch (error) {
            console.error('Hovered cell readback failed.', error);
        } finally {
            if (version === this.hoveredReadVersion) {
                this.hoveredReadPending = false;
            }
        }
    }

    private ShouldApplyHoveredRead(version: number): boolean {
        return version === this.hoveredReadVersion && this.IsAdvancedEnabled();
    }

    /** 
     * Resets FPS, frame time, and step count display fields and clears any pending hovered cell read.
     * Called when the ping-pong target changes.
     * @internal
     */
    public Reset(): void {
        this.lastFrameTimeMs = null;
        this.fpsSampleElapsedMs = 0;
        this.fpsSampleFrames = 0;
        this.fpsValue.textContent = '--';
        this.frameTimeValue.textContent = '--';
        this.simStepsValue.textContent = '--';
        this.physicsStepsValue.textContent = '--';
        this.lastFpsText = '--';
        this.lastFrameTimeText = '--';
        this.lastSimStepsText = '--';
        this.lastPhysicsStepsText = '--';
        this.lastHoveredSampleTimeMs = -DebugPanel.HoveredCellSampleIntervalMs;
        this.lastHoveredCellKey = null;
        this.hoveredReadVersion++;
        this.ClearHoveredCellInfo();
    }

    public OnDestroy(): void {
        this.panel.OnDestroy();
    }
}
