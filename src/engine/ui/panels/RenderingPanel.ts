import type { SelectSetting, RangeSetting } from '../UserInterfaceTypes';

import { CollapsiblePanel } from '../CollapsiblePanel';
import { Modal } from '../Modal';
import { NitrateEngine } from '../../NitrateEngine';
import { NitrateProcess } from '../../NitrateProcess';
import { RangeControl } from '../controls/RangeControl';
import { Renderer } from '../../rendering/Renderer';
import { SceneManager } from '../../scene/SceneManager';
import { SelectControl } from '../controls/SelectControl';
import { SimulationManager } from '../../simulation/SimulationManager';
import { UserInterfaceManager } from '../UserInterfaceManager';

export type RenderingPanelParams = ScaledParams | GridParams;

export interface ScaledParams {
    type: 'scaled';
    resolution?: ReadonlyArray<{ value: number; label?: string }>;
    scale?: { min: number; max: number; default?: number; step?: number };
    onResolutionChange?: () => void;
    onScaleChange?: () => void;
}

export interface GridParams {
    type: 'grid';
    sizes?: ReadonlyArray<{ width: number; height: number; label?: string }>;
    onChange?: () => void;
}

/**
 * Rendering configuration panel.
 * 
 * Supports two modes: scaled (resolution and scale controls) and grid (fixed size presets).
 * Configured entirely via RenderingPanelParams at construction.
 * 
 * ```ts
 * new Nitrate.RenderingPanel(params: RenderingPanelParams)
 * ```
 */
export class RenderingPanel extends NitrateProcess {
    private readonly panel: CollapsiblePanel;

    private resolutionElement: HTMLSelectElement | null = null;
    private resolutionSetting: SelectSetting | null = null;
    private scaleElement: HTMLInputElement | null = null;
    private scaleSetting: RangeSetting | null = null;
    private gridSizeElement: HTMLSelectElement | null = null;
    private gridSizeSetting: SelectSetting | null = null;
    private gridSizes: ReadonlyArray<{ width: number; height: number }> | null = null;

    constructor(params: RenderingPanelParams) {
        super();
        this.panel = new CollapsiblePanel({
            label: 'Rendering',
            parent: UserInterfaceManager.Instance?.toolsDocket as HTMLElement,
        });
        const section = this.panel.AddSection();
        if (params.type === 'scaled') { this.SetupScaled(params, section); }
        else { this.SetupGrid(params, section); }
    }

    /** Builds the resolution and scale controls for scaled rendering mode and sets the initial simulation state. */
    private SetupScaled(params: ScaledParams, section: HTMLElement): void {
        if (params.resolution) {
            this.resolutionSetting = {
                id: 'perf-resolution',
                label: 'Resolution',
                type: 'select',
                default: params.resolution[0]?.value ?? 0,
                options: params.resolution.map(r => ({
                    value: r.value,
                    label: r.label ?? (r.value === 0 ? 'Native' : `${r.value}p`),
                })),
            };
            const { wrapper, element } = SelectControl.Instance.Build('perf-resolution', this.resolutionSetting);
            this.resolutionElement = element as HTMLSelectElement;
            section.appendChild(wrapper);

            const onResolutionChange = () => {
                SimulationManager.Instance?.state.SetResolution(this.GetResolution());
                const canvas = Renderer.Instance?.GetWebGPU()?.canvas;
                if (canvas) { void NitrateEngine.Resize({ width: canvas.width, height: canvas.height }); }
                params.onResolutionChange?.();
            };
            let prevResolution = this.resolutionElement.value;
            this.resolutionElement.addEventListener('mousedown', () => { prevResolution = this.resolutionElement!.value; });
            this.resolutionElement.addEventListener('change', () => {
                void this.HandleDirtyChange('Change Resolution and Clear Scene?', () => {
                    this.resolutionElement!.value = prevResolution;
                }, onResolutionChange);
            });
        }

        if (params.scale) {
            this.scaleSetting = {
                id: 'perf-scale',
                label: 'Scale',
                type: 'range',
                min: params.scale.min,
                max: params.scale.max,
                step: params.scale.step ?? 5,
                default: params.scale.default ?? params.scale.min,
                suffix: '%',
                decimals: 0,
                readout: true,
            };
            const { wrapper, element, sync } = RangeControl.Instance.Build('perf-scale', this.scaleSetting);
            this.scaleElement = element as HTMLInputElement;
            section.appendChild(wrapper);
            sync?.();

            const onScaleChange = () => {
                SimulationManager.Instance?.state.SetResolutionScale(this.GetResolutionScale());
                const canvas = Renderer.Instance?.GetWebGPU()?.canvas;
                if (canvas) { void NitrateEngine.Resize({ width: canvas.width, height: canvas.height }); }
                params.onScaleChange?.();
            };
            let prevScale = this.scaleElement.value;
            this.scaleElement.addEventListener('pointerdown', () => { prevScale = this.scaleElement!.value; });
            this.scaleElement.addEventListener('input', () => { sync?.(); });
            this.scaleElement.addEventListener('change', () => {
                void this.HandleDirtyChange('Change Scale and Clear Scene?', () => {
                    this.scaleElement!.value = prevScale; sync?.();
                }, onScaleChange);
            });
        }

        SimulationManager.Instance?.state.SetResolution(this.GetResolution());
        SimulationManager.Instance?.state.SetResolutionScale(this.GetResolutionScale());
    }

    /** Builds the grid size selector for grid rendering mode and sets the initial simulation resolution. */
    private SetupGrid(params: GridParams, section: HTMLElement): void {
        if (!params.sizes || params.sizes.length === 0) { return; }

        this.gridSizes = params.sizes;
        this.gridSizeSetting = {
            id: 'render-grid-size',
            label: 'Grid Size',
            type: 'select',
            default: 0,
            options: params.sizes.map((s, i) => ({
                value: i,
                label: s.label ?? `${s.width} × ${s.height}`,
            })),
        };
        const { wrapper, element } = SelectControl.Instance.Build('render-grid-size', this.gridSizeSetting);
        this.gridSizeElement = element as HTMLSelectElement;
        section.appendChild(wrapper);

        const onGridSizeChange = () => {
            const { width } = this.GetGridDimensions();
            SimulationManager.Instance?.state.SetResolution(width);
            SimulationManager.Instance?.OnResize();
            params.onChange?.();
        };
        let prevSize = this.gridSizeElement.value;
        this.gridSizeElement.addEventListener('mousedown', () => { prevSize = this.gridSizeElement!.value; });
        this.gridSizeElement.addEventListener('change', () => {
            void this.HandleDirtyChange('Change Grid Size and Clear Scene?', () => {
                this.gridSizeElement!.value = prevSize;
            }, onGridSizeChange);
        });

        SimulationManager.Instance?.state.SetResolution(params.sizes[0].width);
    }

    /** Returns the currently selected resolution value, or 0 (native) if no resolution control exists. */
    public GetResolution(): number {
        if (!this.resolutionElement || !this.resolutionSetting) { return 0; }
        return SelectControl.Instance.GetRawValue(this.resolutionElement, this.resolutionSetting);
    }

    /** Returns the current resolution scale as a 0–1 value, or 1.0 if no scale control exists. */
    public GetResolutionScale(): number {
        if (!this.scaleElement || !this.scaleSetting) { return 1.0; }
        const value = RangeControl.Instance.GetRawValue(this.scaleElement, this.scaleSetting);
        return value / this.scaleSetting.max;
    }

    /** Returns the width and height of the currently selected grid size preset, or 64×64 if no grid control exists. */
    public GetGridDimensions(): { width: number; height: number } {
        if (!this.gridSizeElement || !this.gridSizeSetting || !this.gridSizes) { return { width: 64, height: 64 }; }
        const index = SelectControl.Instance.GetRawValue(this.gridSizeElement, this.gridSizeSetting);
        return this.gridSizes[index] ?? { width: 64, height: 64 };
    }

    /**
     * Switches to the grid preset that matches (w, h) exactly, or the smallest preset whose
     * dimensions both fit (w, h). Returns true if the active preset actually changed.
     */
    public SetGridSize(w: number, h: number): boolean {
        if (!this.gridSizeElement || !this.gridSizes) { return false; }
        let idx = this.gridSizes.findIndex(s => s.width === w && s.height === h);
        if (idx === -1) {
            idx = this.gridSizes.findIndex(s => s.width >= w && s.height >= h);
        }
        if (idx === -1) { return false; }
        const currentIdx = parseInt(this.gridSizeElement.value, 10);
        if (currentIdx === idx) { return false; }
        this.gridSizeElement.value = String(idx);
        SimulationManager.Instance?.state.SetResolution(this.GetGridDimensions().width);
        return true;
    }

    /**
     * Prompts the user to confirm a destructive change if the scene is dirty.
     * Reverts and returns early if cancelled, otherwise clears dirty state and fires the onChange callback.
     */
    private async HandleDirtyChange(title: string, revert: () => void, onChange: (() => void) | undefined): Promise<void> {
        if (SceneManager.IsDirty()) {
            const confirmed = await Modal.Confirm({ title, confirmLabel: 'Confirm', cancelLabel: 'Cancel' });
            if (!confirmed) { revert(); return; }
            SceneManager.ClearDirty();
        }
        onChange?.();
    }

    public OnDestroy(): void {
        this.panel.OnDestroy();
    }
}
