import type { BrushShape, BrushMode, BrushType } from '../../brush/BrushTypes';
import type { BrushState } from '../../brush/BrushState';
import type { ChoiceSetting, PaletteSetting, RangeSetting } from '../UserInterfaceTypes';
import type { Color } from '../../definitions/Primitives'

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
    private modeOptionsSection: HTMLElement | null = null;
    
    private overlayFilterElement: HTMLDivElement | null = null;
    private overlayFilterSetting: ChoiceSetting | null = null;

    private typeElement: HTMLDivElement | null = null;
    private typeSetting: ChoiceSetting | null = null;
    private typeSync: (() => void) | undefined = undefined;

    private snapElement: HTMLDivElement | null = null;
    private snapSetting: ChoiceSetting | null = null;

    private paletteElement: HTMLDivElement | null = null;
    private paletteSection: HTMLElement | null = null;

    private colorWeightSection: HTMLElement | null = null;
    private readonly colorWeightElements: HTMLInputElement[] = [];
    private readonly colorWeightSwatches: HTMLElement[] = [];

    private stripeAngleElement: HTMLInputElement | null = null;
    private stripeAngleSetting: RangeSetting | null = null;
    private stripeAngleSection: HTMLElement | null = null;

    private stripeWidthElement: HTMLInputElement | null = null;
    private stripeWidthSetting: RangeSetting | null = null;

    private wheelTarget: HTMLElement | null = null;
    private readonly handleWheel: (e: WheelEvent) => void;

    private static readonly paletteSetting: PaletteSetting = {
        id: 'brush-palette',
        type: 'palette',
        count: 4,
        default: 0,
        tooltip: 'Select the active color variant for the brush.',
    };

    constructor(options: BrushOptions) {
        super();
        this.Register();

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
        this.SetupColorWeights(brushManager);
        this.SetupStripeAngle(brushManager);
        this.SetupStripeWidth(brushManager);

        this.sizeSync?.();
        this.SyncBrushTypeControls();
        this.SyncBrushModeControls();
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
            tooltip: 'Adjusts the size of the brush.',
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
            tooltip: 'Percentage of cells filled within the brush area.',
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
            options: [
                { value: 'circle', label: 'Circle', tooltip: 'Round brush shape.' },
                { value: 'square', label: 'Square', tooltip: 'Square brush shape.' },
            ],
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

    /** Builds the brush fill/mask mode choice control and binds it to BrushState. */
    private SetupMode(options: BrushOptions, brushManager: () => BrushState | undefined): void {
        const o = options.mode;
        if (!o) { return; }
        this.modeSetting = {
            id: 'brush-mode', type: 'choice',
            options: [
                { value: 'fill', label: 'Fill', tooltip: 'Enables painting over any cells.' },
                { value: 'mask', label: 'Mask', tooltip: 'Only places material where cells are empty.' },
                { value: 'overlay', label: 'Overlay', tooltip: 'Enables painting only on cells that are not empty.' },
            ],
            default: o.default ?? 'fill',
        };
        const { wrapper, element } = ChoiceControl.Instance.Build('brush-mode', this.modeSetting);
        this.modeElement = element as HTMLDivElement;
        if (o.show !== false) { this.panel.AddSection('Mode').appendChild(wrapper); }
        ChoiceControl.Instance.Bind('brush-mode', this.modeElement, {}, () => {
            this.SyncBrushModeControls();
            brushManager()?.SetMode(this.GetMode());
        }, null);
        this.SetupOverlayFilter(brushManager);
    }

    /** Builds the overlay filter choice control shown in the mode options section when overlay mode is active. */
    private SetupOverlayFilter(brushManager: () => BrushState | undefined): void {
        this.overlayFilterSetting = {
            id: 'brush-overlay-filter', type: 'choice',
            options: [
                { value: 'disabled', label: 'Disabled', tooltip: 'Overlay draws on any painted cells.' },
                { value: 'enabled', label: 'Enabled', tooltip: 'Overlay only draws on cells matching the active material.' },
            ],
            default: 'disabled',
        };
        const { wrapper, element } = ChoiceControl.Instance.Build('brush-overlay-filter', this.overlayFilterSetting);
        this.overlayFilterElement = element as HTMLDivElement;
        this.modeOptionsSection = this.panel.AddSection('Filter');
        this.modeOptionsSection.appendChild(wrapper);
        ChoiceControl.Instance.Bind('brush-overlay-filter', this.overlayFilterElement, {}, () => {
            brushManager()?.SetOverlayFilter(this.GetOverlayFilter());
        }, null);
    }

    /** Returns the current brush mode, or 'fill' if no mode control exists. */
    public GetMode(): BrushMode {
        if (!this.modeElement || !this.modeSetting) { return 'fill'; }
        const value = ChoiceControl.Instance.GetRawValue(this.modeElement, this.modeSetting);
        if (value === 'mask' || value === 'overlay') { return value; }
        return 'fill';
    }

    /** Builds the brush type (noise/palette) choice control and binds it to BrushState. */
    private SetupType(options: BrushOptions, brushManager: () => BrushState | undefined): void {
        const o = options.type;
        if (!o) { return; }
        this.typeSetting = {
            id: 'brush-type', type: 'choice',
            options: [
                { value: 'noise', label: 'Noise', tooltip: 'Random color variation within the palette.' },
                { value: 'palette', label: 'Palette', tooltip: 'Solid fill using the selected palette color.' },
                { value: 'scatter', label: 'Scatter', tooltip: 'Randomly scatter palette colors across the brush area.' },
                { value: 'boxes', label: 'Boxes', tooltip: 'Fill with rectangular blocks of palette colors.' },
                { value: 'stripes', label: 'Stripes', tooltip: 'Fill with angled stripes of palette colors.' },
                { value: 'circles', label: 'Circles', tooltip: 'Fill with circular patches of palette colors.' },
            ],
            default: o.default ?? 'noise',
        };
        const { wrapper, element, sync } = ChoiceControl.Instance.Build('brush-type', this.typeSetting);
        this.typeElement = element as HTMLDivElement;
        this.typeSync = sync;
        if (o.show !== false) { this.panel.AddSection('Type').appendChild(wrapper); }
        ChoiceControl.Instance.Bind('brush-type', this.typeElement, {}, () => {
            this.SyncBrushTypeControls(); brushManager()?.SetType(this.GetBrushType());
        }, null);
    }

    /** Returns the current brush type, or 'noise' if no type control exists. */
    public GetBrushType(): BrushType {
        if (!this.typeElement || !this.typeSetting) { return 'noise'; }
        const value = ChoiceControl.Instance.GetRawValue(this.typeElement, this.typeSetting);
        if (value === 'palette' || value === 'scatter' || value === 'boxes' || value === 'stripes' || value === 'circles') { return value; }
        return 'noise';
    }

    /** Builds the brush snap choice control and binds it to BrushState. */
    private SetupSnap(options: BrushOptions, brushManager: () => BrushState | undefined): void {
        const o = options.snap;
        if (!o) { return; }
        this.snapSetting = {
            id: 'brush-snap', type: 'choice',
            options: [
                { value: 'free', label: 'Free', tooltip: 'Brush follows the cursor freely.' },
                { value: 'snap', label: 'Snap', tooltip: 'Brush snaps to a fixed grid when painting.' },
            ],
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
                this.SyncBrushTypeControls();
                brushManager()?.SetType('palette');
                brushManager()?.SetColor(i);
            });
        });
    }

    /** Builds the per-color weight sliders for the boxes brush type. */
    private SetupColorWeights(brushManager: () => BrushState | undefined): void {
        this.colorWeightSection = this.panel.AddSection('Color Weights');
        const defaults: [number, number, number, number] = [82, 6, 6, 6];

        for (let i = 0; i < 4; i++) {
            const id = `brush-box-weight-${i}`;
            const setting: RangeSetting = {
                id,
                label: '',
                type: 'range',
                min: 0, max: 100, step: 1,
                default: defaults[i],
                suffix: '%', decimals: 0, readout: true,
            };
            const { wrapper, element, sync } = RangeControl.Instance.Build(id, setting);
            const input = element as HTMLInputElement;
            this.colorWeightElements.push(input);

            const swatch = document.createElement('span');
            swatch.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:middle;background:#999;';
            this.colorWeightSwatches.push(swatch);
            wrapper.prepend(swatch);

            this.colorWeightSection.appendChild(wrapper);
            RangeControl.Instance.Bind(id, input, { sync }, () => {
                sync?.();
                this.PushColorWeights(brushManager);
            }, null);
        }
    }

    /** Builds the stripe angle range control and binds it to BrushState. */
    private SetupStripeAngle(brushManager: () => BrushState | undefined): void {
        this.stripeAngleSetting = {
            id: 'brush-stripe-angle', label: 'Angle', type: 'range',
            min: 0, max: 360, step: 1,
            default: 45,
            suffix: '°', decimals: 0, readout: true,
            tooltip: 'Angle of the stripe pattern.',
        };
        const { wrapper, element, sync } = RangeControl.Instance.Build('brush-stripe-angle', this.stripeAngleSetting);
        this.stripeAngleElement = element as HTMLInputElement;
        this.stripeAngleSection = this.panel.AddSection('Stripe Settings');
        this.stripeAngleSection.appendChild(wrapper);
        RangeControl.Instance.Bind('brush-stripe-angle', this.stripeAngleElement, { sync }, () => {
            sync?.();
            if (!this.stripeAngleElement || !this.stripeAngleSetting) { return; }
            brushManager()?.SetStripeAngle(
                RangeControl.Instance.GetRawValue(this.stripeAngleElement, this.stripeAngleSetting)
            );
        }, null);
    }

    /** Builds the stripe width range control and appends it to the stripe angle section. */
    private SetupStripeWidth(brushManager: () => BrushState | undefined): void {
        if (!this.stripeAngleSection) { return; }
        this.stripeWidthSetting = {
            id: 'brush-stripe-width', label: 'Width', type: 'range',
            min: 1, max: 32, step: 1,
            default: 4,
            suffix: '', decimals: 0, readout: true,
            tooltip: 'Width of each stripe.',
        };
        const { wrapper, element, sync } = RangeControl.Instance.Build('brush-stripe-width', this.stripeWidthSetting);
        this.stripeWidthElement = element as HTMLInputElement;
        this.stripeAngleSection.appendChild(wrapper);
        RangeControl.Instance.Bind('brush-stripe-width', this.stripeWidthElement, { sync }, () => {
            sync?.();
            if (!this.stripeWidthElement || !this.stripeWidthSetting) { return; }
            brushManager()?.SetStripeWidth(
                RangeControl.Instance.GetRawValue(this.stripeWidthElement, this.stripeWidthSetting)
            );
        }, null);
    }

    /** Normalizes and pushes the box weight slider values to BrushState. */
    private PushColorWeights(brushManager: () => BrushState | undefined): void {
        if (this.colorWeightElements.length !== 4) { return; }
        const weights = this.colorWeightElements.map(el => parseFloat(el.value) || 0);
        brushManager()?.SetColorWeights(weights as [number, number, number, number]);
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
        this.SyncBrushTypeControls();
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
        if (this.overlayFilterElement) { brushManager.SetOverlayFilter(this.GetOverlayFilter()); }
        this.PushColorWeights(() => brushManager);
        if (this.stripeAngleElement && this.stripeAngleSetting) {
            brushManager.SetStripeAngle(
                RangeControl.Instance.GetRawValue(this.stripeAngleElement, this.stripeAngleSetting)
            );
        }
        if (this.stripeWidthElement && this.stripeWidthSetting) {
            brushManager.SetStripeWidth(
                RangeControl.Instance.GetRawValue(this.stripeWidthElement, this.stripeWidthSetting)
            );
        }
    }

    /** Updates the palette swatch colors from an array of Color values. Also updates box weight swatches. */
    public SetPaletteColors(colors: Color[]): void {
        if (this.paletteElement) {
            this.paletteElement.querySelectorAll<HTMLElement>('.palette-swatch').forEach((swatch, i) => {
                const c = colors[i];
                if (c) { swatch.style.backgroundColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`; }
            });
        }
        this.colorWeightSwatches.forEach((swatch, i) => {
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

    /** Returns whether the overlay filter is enabled, or false if no filter control exists. */
    public GetOverlayFilter(): boolean {
        if (!this.overlayFilterElement || !this.overlayFilterSetting) { return false; }
        return ChoiceControl.Instance.GetRawValue(this.overlayFilterElement, this.overlayFilterSetting) === 'enabled';
    }

    /** Shows or hides the mode options section based on the current brush mode. */
    private SyncBrushModeControls(): void {
        if (this.modeOptionsSection) {
            this.modeOptionsSection.style.display = this.GetMode() === 'overlay' ? '' : 'none';
        }
    }

    /** Shows or hides the palette and box weight sections based on the current brush type. */
    private SyncBrushTypeControls(): void {
        if (this.paletteSection) {
            this.paletteSection.style.display = this.GetBrushType() === 'palette' ? '' : 'none';
        }
        if (this.colorWeightSection) {
            const type = this.GetBrushType();
            this.colorWeightSection.style.display = (type === 'boxes' || type === 'circles') ? '' : 'none';
        }
        if (this.stripeAngleSection) {
            this.stripeAngleSection.style.display = this.GetBrushType() === 'stripes' ? '' : 'none';
        }
    }

    public OnDestroy(): void {
        if (this.wheelTarget) {
            this.wheelTarget.removeEventListener('wheel', this.handleWheel);
        }
        this.panel.OnDestroy();
    }
}
