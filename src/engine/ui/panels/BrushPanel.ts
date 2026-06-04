import type { BrushShape, BrushMode, BrushType } from '../../brush/BrushTypes';
import type { BrushState } from '../../brush/BrushState';
import type { Color } from '../../definitions/Primitives'
import type { RangeSetting, ChoiceSetting, PaletteSetting } from '../UserInterfaceTypes';

import { BrushManager } from '../../brush/BrushManager';
import { ChoiceControl } from '../controls/ChoiceControl';
import { CollapsiblePanel } from '../CollapsiblePanel';
import { NitrateProcess } from '../../NitrateProcess';
import { PaletteControl } from '../controls/PalletteControl';
import { RangeControl } from '../controls/RangeControl';
import { Renderer } from '../../rendering/Renderer';
import { UserInterfaceConfig } from '../../config/UserInterfaceConfig';
import { UserInterfaceManager } from '../UserInterfaceManager';
import { Utils } from '../../utility/Utils';

export interface BrushOptions {
    size?: { min: number; max: number; default?: number; show?: boolean; };
    density?: { min: number; max: number; default?: number; show?: boolean; };
    shape?: { default?: BrushShape; show?: boolean; };
    mode?: { default?: BrushMode; show?: boolean; };
    type?: { default?: BrushType; show?: boolean; };
    snap?: { default?: boolean; show?: boolean; };
    style?: Partial<CSSStyleDeclaration>;
    collapsed?: boolean;
}

/** 
 * Brush settings panel.
 * 
 * Builds and manages controls for size, density, shape, mode, type, snap, and palette.
 * Each control is optional and configured via BrushOptions.
 * 
 * ```ts
 * new Nitrate.BrushPanel({options: BrushOptions})
 * ```
 */
export class BrushPanel extends NitrateProcess {
    private readonly panel: CollapsiblePanel;

    private sizeElement: HTMLInputElement | null = null;
    private sizeSetting: RangeSetting | null = null;
    private sizeSync: (() => void) | undefined = undefined;

    private densityElement: HTMLInputElement | null = null;
    private densitySetting: RangeSetting | null = null;

    private shapeElement: HTMLDivElement | null = null;
    private shapeSetting: ChoiceSetting | null = null;

    private modeElement: HTMLDivElement | null = null;
    private modeSetting: ChoiceSetting | null = null;

    private typeElement: HTMLDivElement | null = null;
    private typeSetting: ChoiceSetting | null = null;
    private typeSync: (() => void) | undefined = undefined;

    private snapElement: HTMLDivElement | null = null;
    private snapSetting: ChoiceSetting | null = null;

    private paletteElement: HTMLDivElement | null = null;
    private paletteSection: HTMLElement | null = null;

    private wheelTarget: HTMLElement | null = null;
    private readonly handleWheel: (e: WheelEvent) => void;

    private static readonly paletteSetting: PaletteSetting = {
        id: 'brush-palette',
        type: 'palette',
        count: 4,
        default: 0,
    };

    constructor(options: BrushOptions) {
        super();

        const defaults = UserInterfaceConfig.GetConfig().defaults.brush;
        this.panel = new CollapsiblePanel({
            label: 'Brush',
            parent: UserInterfaceManager.Instance?.panelContent,
            collapsed: options?.collapsed ?? defaults.collapsed,
            style: { ...defaults.style, ...options?.style }
        });

        const brushManager = () => BrushManager.Instance?.state;
        if (options.size !== undefined) { this.SetupSize(options, brushManager); }
        if (options.density !== undefined) { this.SetupDensity(options, brushManager); }
        if (options.shape !== undefined) { this.SetupShape(options, brushManager); }
        if (options.mode !== undefined) { this.SetupMode(options, brushManager); }
        if (options.type !== undefined) { this.SetupType(options, brushManager); }
        if (options.snap !== undefined) { this.SetupSnap(options, brushManager); }
        this.SetupPalette(brushManager);

        this.sizeSync?.();
        this.SyncPaletteVisibility();
        this.ApplySettings();

        this.handleWheel = (e: WheelEvent) => {
            if (!this.sizeElement || !this.sizeSetting) { return; }
            e.preventDefault();
            const next = Utils.Clamp(this.GetSize() - Math.sign(e.deltaY), this.sizeSetting.min, this.sizeSetting.max);
            this.sizeElement.value = String(next);
            this.sizeSync?.();
            brushManager()?.SetSize(next);
        };

        const canvas = Renderer.Instance?.GetWebGPU()?.canvas;
        if (canvas) { this.SetWheelTarget(canvas); }

        if (BrushManager.Instance) {
            BrushManager.Instance.onPaletteChange = (colors: Color[]) => { this.SetPaletteColors(colors); };
        }
    }

    /** Builds the brush size range control and binds it to BrushState. */
    private SetupSize(options: BrushOptions, brushManager: () => BrushState | undefined): void {
        const o = options.size;
        if (!o) { return; }
        this.sizeSetting = {
            id: 'brush-size', label: 'Size', type: 'range',
            min: o.min, max: o.max, step: 1,
            default: o.default ?? o.min,
            suffix: '', decimals: 0, readout: true,
        };
        const { wrapper, element, sync } = RangeControl.Instance.Build('brush-size', this.sizeSetting);
        this.sizeElement = element as HTMLInputElement;
        this.sizeSync = sync;
        if (o.show !== false) { this.panel.AddSection().appendChild(wrapper); }
        RangeControl.Instance.Bind('brush-size', this.sizeElement, { sync }, () => {
            sync?.(); brushManager()?.SetSize(this.GetSize());
        }, null);
    }

    /** Returns the current brush size, or 0 if no size control exists. */
    public GetSize(): number {
        if (!this.sizeElement || !this.sizeSetting) { return 0; }
        return RangeControl.Instance.GetRawValue(this.sizeElement, this.sizeSetting);
    }

    /** Builds the brush density range control and binds it to BrushState. */
    private SetupDensity(options: BrushOptions, brushManager: () => BrushState | undefined): void {
        const o = options.density;
        if (!o) { return; }
        this.densitySetting = {
            id: 'brush-density', label: 'Density', type: 'range',
            min: o.min, max: o.max, step: 1,
            default: o.default ?? o.max,
            suffix: '%', decimals: 0, readout: true,
        };
        const { wrapper, element, sync } = RangeControl.Instance.Build('brush-density', this.densitySetting);
        this.densityElement = element as HTMLInputElement;
        if (o.show !== false) { this.panel.AddSection().appendChild(wrapper); }
        RangeControl.Instance.Bind('brush-density', this.densityElement, { sync }, () => {
            sync?.(); brushManager()?.SetDensity(this.GetDensity());
        }, null);
    }

    /** Returns the current brush density as a 0–1 value, or 1.0 if no density control exists. */
    public GetDensity(): number {
        if (!this.densityElement || !this.densitySetting) { return 1.0; }
        const raw = RangeControl.Instance.GetRawValue(this.densityElement, this.densitySetting);
        return (raw - this.densitySetting.min) / (this.densitySetting.max - this.densitySetting.min);
    }

    /** Builds the brush shape choice control and binds it to BrushState. */
    private SetupShape(options: BrushOptions, brushManager: () => BrushState | undefined): void {
        const o = options.shape;
        if (!o) { return; }
        this.shapeSetting = {
            id: 'brush-shape', type: 'choice',
            options: [{ value: 'circle', label: 'Circle' }, { value: 'square', label: 'Square' }],
            default: o.default ?? 'circle',
        };
        const { wrapper, element } = ChoiceControl.Instance.Build('brush-shape', this.shapeSetting);
        this.shapeElement = element as HTMLDivElement;
        if (o.show !== false) { this.panel.AddSection('Shape').appendChild(wrapper); }
        ChoiceControl.Instance.Bind('brush-shape', this.shapeElement, {}, () => {
            brushManager()?.SetShape(this.GetShape());
        }, null);
    }

    /** Returns the current brush shape, or 'circle' if no shape control exists. */
    public GetShape(): BrushShape {
        if (!this.shapeElement || !this.shapeSetting) { return 'circle'; }
        return ChoiceControl.Instance.GetRawValue(this.shapeElement, this.shapeSetting) === 'square' ? 'square' : 'circle';
    }

    /** Builds the brush draw/erase mode choice control and binds it to BrushState. */
    private SetupMode(options: BrushOptions, brushManager: () => BrushState | undefined): void {
        const o = options.mode;
        if (!o) { return; }
        this.modeSetting = {
            id: 'brush-mode', type: 'choice',
            options: [{ value: 'draw', label: 'Draw' }, { value: 'erase', label: 'Erase' }],
            default: o.default ?? 'draw',
        };
        const { wrapper, element } = ChoiceControl.Instance.Build('brush-mode', this.modeSetting);
        this.modeElement = element as HTMLDivElement;
        if (o.show !== false) { this.panel.AddSection('Mode').appendChild(wrapper); }
        ChoiceControl.Instance.Bind('brush-mode', this.modeElement, {}, () => {
            brushManager()?.SetMode(this.GetMode());
        }, null);
    }

    /** Returns the current brush mode, or 'draw' if no mode control exists. */
    public GetMode(): BrushMode {
        if (!this.modeElement || !this.modeSetting) { return 'draw'; }
        return ChoiceControl.Instance.GetRawValue(this.modeElement, this.modeSetting) === 'erase' ? 'erase' : 'draw';
    }

    /** Builds the brush type (noise/palette) choice control and binds it to BrushState. */
    private SetupType(options: BrushOptions, brushManager: () => BrushState | undefined): void {
        const o = options.type;
        if (!o) { return; }
        this.typeSetting = {
            id: 'brush-type', type: 'choice',
            options: [{ value: 'noise', label: 'Noise' }, { value: 'palette', label: 'Palette' }],
            default: o.default ?? 'noise',
        };
        const { wrapper, element, sync } = ChoiceControl.Instance.Build('brush-type', this.typeSetting);
        this.typeElement = element as HTMLDivElement;
        this.typeSync = sync;
        if (o.show !== false) { this.panel.AddSection('Type').appendChild(wrapper); }
        ChoiceControl.Instance.Bind('brush-type', this.typeElement, {}, () => {
            this.SyncPaletteVisibility(); brushManager()?.SetType(this.GetBrushType());
        }, null);
    }

    /** Returns the current brush type, or 'noise' if no type control exists. */
    public GetBrushType(): BrushType {
        if (!this.typeElement || !this.typeSetting) { return 'noise'; }
        return ChoiceControl.Instance.GetRawValue(this.typeElement, this.typeSetting) === 'palette' ? 'palette' : 'noise';
    }

    /** Builds the brush snap choice control and binds it to BrushState. */
    private SetupSnap(options: BrushOptions, brushManager: () => BrushState | undefined): void {
        const o = options.snap;
        if (!o) { return; }
        this.snapSetting = {
            id: 'brush-snap', type: 'choice',
            options: [{ value: 'free', label: 'Free' }, { value: 'snap', label: 'Snap' }],
            default: (o.default ?? false) ? 'snap' : 'free',
        };
        const { wrapper, element } = ChoiceControl.Instance.Build('brush-snap', this.snapSetting);
        this.snapElement = element as HTMLDivElement;
        if (o.show !== false) { this.panel.AddSection('Snap').appendChild(wrapper); }
        ChoiceControl.Instance.Bind('brush-snap', this.snapElement, {}, () => {
            brushManager()?.SetSnap(this.GetSnap());
        }, null);
    }

    /** Returns whether snap is enabled, or false if no snap control exists. */
    public GetSnap(): boolean {
        if (!this.snapElement || !this.snapSetting) { return false; }
        return ChoiceControl.Instance.GetRawValue(this.snapElement, this.snapSetting) === 'snap';
    }

    /** Builds the palette swatch control and wires swatch clicks to BrushState color and type. */
    private SetupPalette(brushManager: () => BrushState | undefined): void {
        this.paletteSection = this.panel.AddSection('Palette');
        const { wrapper, element: paletteEl, sync: paletteSync } = PaletteControl.Instance.Build('brush-palette', BrushPanel.paletteSetting);
        this.paletteElement = paletteEl as HTMLDivElement;
        this.paletteSection.appendChild(wrapper);

        this.paletteElement.querySelectorAll('.palette-swatch').forEach((swatch, i) => {
            swatch.addEventListener('click', () => {
                this.paletteElement!.dataset.value = String(i);
                paletteSync?.();
                if (this.typeElement) {
                    this.typeElement.dataset.value = 'palette';
                    this.typeSync?.();
                }
                this.SyncPaletteVisibility();
                brushManager()?.SetType('palette');
                brushManager()?.SetColor(i);
            });
        });
    }

    /** Sets the brush type, updating the control UI and BrushManager. */
    public SetBrushType(type: BrushType): void {
        if (!this.typeElement || !this.typeSetting) { return; }
        const group = this.typeElement as HTMLDivElement;
        group.dataset.value = type;
        group.querySelectorAll<HTMLButtonElement>('button').forEach(btn => {
            const selected = btn.dataset.value === type;
            btn.classList.toggle('is-selected', selected);
            btn.setAttribute('aria-checked', String(selected));
        });
        this.SyncPaletteVisibility();
        BrushManager.Instance?.state.SetType(type);
    }

    /** Sets the active palette color variant, updating the control UI and BrushManager. */
    public SetColorVariant(index: number): void {
        if (!this.paletteElement) { return; }
        const group = this.paletteElement as HTMLDivElement;
        group.dataset.value = String(index);
        group.querySelectorAll<HTMLElement>('.palette-swatch').forEach((swatch, i) => {
            swatch.classList.toggle('is-selected', i === index);
        });
        BrushManager.Instance?.state.SetColor(index);
    }

    /** Returns the currently selected palette color variant index, or 0 if no palette exists. */
    public GetColorVariant(): number {
        if (!this.paletteElement) { return 0; }
        return PaletteControl.Instance.GetRawValue(this.paletteElement, BrushPanel.paletteSetting);
    }

    /** Pushes all current panel values to BrushState. Call after BrushManager reinitializes. */
    public ApplySettings(): void {
        const brushManager = BrushManager.Instance?.state;
        if (!brushManager) { return; }

        if (this.sizeElement && this.sizeSetting) { brushManager.SetSize(this.GetSize()); }
        if (this.densityElement && this.densitySetting) { brushManager.SetDensity(this.GetDensity()); }
        if (this.shapeElement && this.shapeSetting) { brushManager.SetShape(this.GetShape()); }
        if (this.modeElement && this.modeSetting) { brushManager.SetMode(this.GetMode()); }
        if (this.typeElement && this.typeSetting) { brushManager.SetType(this.GetBrushType()); }
        if (this.snapElement && this.snapSetting) { brushManager.SetSnap(this.GetSnap()); }
    }

    /** Updates the palette swatch colors from an array of Color values. */
    public SetPaletteColors(colors: Color[]): void {
        if (!this.paletteElement) { return; }
        this.paletteElement.querySelectorAll<HTMLElement>('.palette-swatch').forEach((swatch, i) => {
            const c = colors[i];
            if (c) { swatch.style.backgroundColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`; }
        });
    }

    /** Sets the element that receives wheel events for brush size adjustment, removing the listener from the previous target. */
    public SetWheelTarget(element: HTMLElement): void {
        if (this.wheelTarget) { this.wheelTarget.removeEventListener('wheel', this.handleWheel); }
        this.wheelTarget = element;
        element.addEventListener('wheel', this.handleWheel, { passive: false });
    }

    /** Shows or hides the palette section based on the current brush type. */
    private SyncPaletteVisibility(): void {
        if (!this.paletteSection) { return; }
        this.paletteSection.style.display = this.GetBrushType() === 'palette' ? '' : 'none';
    }

    public OnDestroy(): void {
        if (this.wheelTarget) {
            this.wheelTarget.removeEventListener('wheel', this.handleWheel);
        }
        this.panel.OnDestroy();
    }
}
