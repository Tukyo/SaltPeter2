import type { ChoiceSetting, SelectSetting, ToggleGroupSetting } from '../UserInterfaceTypes';
import type { MaterialId, MaterialName, MaterialOccupancy } from '../../materials/definitions/MaterialIdentity';
import type { MaterialPhase } from '../../materials/definitions/MaterialPhases';

import { BrushManager } from '../../brush/BrushManager';
import { ChoiceControl } from '../controls/ChoiceControl';
import { CollapsiblePanel } from '../CollapsiblePanel';
import { MaterialQuery } from '../../materials/MaterialQuery';
import { MaterialRegistry } from '../../materials/MaterialRegistry';
import { NitrateProcess } from '../../NitrateProcess';
import { SelectControl } from '../controls/SelectControl';
import { ToggleGroupControl } from '../controls/ToggleGroupControl';
import { UserInterfaceManager } from '../UserInterfaceManager';

export interface MaterialsPanelParams {
    activeMaterial?: {
        defaultMaterial?: MaterialName;
        show?: boolean;
    };
    occupancy?: {
        default?: MaterialOccupancy;
        show?: boolean;
    };
    phases?: {
        options?: MaterialPhase | MaterialPhase[];
        default?: MaterialPhase | MaterialPhase[];
        show?: boolean;
    };
    tags?: {
        options?: string | string[];
        show?: boolean;
    };
}

/** 
 * Material selection panel.
 * 
 * Provides an active material dropdown, occupancy toggle, phase/tag filters, and a per-material variant picker.
 * 
 * ```ts
 * new Nitrate.MaterialsPanel({options: MaterialsPanelParams})
 * ```
 */
export class MaterialsPanel extends NitrateProcess {
    private readonly panel: CollapsiblePanel;

    private materialElement: HTMLSelectElement | null = null;
    private materialSetting: SelectSetting | null = null;
    private phaseElement: HTMLDivElement | null = null;
    private phaseSetting: ToggleGroupSetting | null = null;
    private tagElement: HTMLDivElement | null = null;
    private tagSetting: ToggleGroupSetting | null = null;
    private occupancyElement: HTMLDivElement | null = null;
    private occupancySetting: ChoiceSetting | null = null;
    private variantSection: HTMLElement | null = null;
    private variantElement: HTMLDivElement | null = null;
    private variantSetting: ChoiceSetting | null = null;

    constructor(params?: MaterialsPanelParams) {
        super();

        const defaultMaterialId = params?.activeMaterial?.defaultMaterial
            ? MaterialRegistry.Materials[params.activeMaterial.defaultMaterial]?.id
            : undefined;

        this.panel = new CollapsiblePanel({
            label: 'Materials',
            parent: UserInterfaceManager.Instance?.toolsDocket as HTMLElement
        });

        this.SetupMaterial(params, defaultMaterialId);
        this.SetupOccupancy(params);
        this.SetupVariantSection();
        this.SetupFilters(params);
        this.SetupBindings(defaultMaterialId);
    }

    /** Builds the active material select control. */
    private SetupMaterial(params: MaterialsPanelParams | undefined, defaultMaterialId: MaterialId | undefined): void {
        const section = this.panel.AddSection();
        this.materialSetting = {
            id: 'mat-active',
            label: 'Active Material',
            type: 'select',
            default: defaultMaterialId ?? 0,
            options: [],
        };
        const { wrapper, element } = SelectControl.Instance.Build('mat-active', this.materialSetting);
        this.materialElement = element as HTMLSelectElement;
        if (params?.activeMaterial?.show !== false) { section.appendChild(wrapper); }
    }

    /** Builds the occupancy (dynamic/static) choice control. */
    private SetupOccupancy(params: MaterialsPanelParams | undefined): void {
        const section = this.panel.AddSection('Occupancy');
        this.occupancySetting = {
            id: 'mat-occupancy',
            type: 'choice',
            default: params?.occupancy?.default ?? 'dynamic',
            options: [
                { value: 'dynamic', label: 'Dynamic' },
                { value: 'static', label: 'Static' },
            ],
        };
        const { wrapper, element } = ChoiceControl.Instance.Build('mat-occupancy', this.occupancySetting);
        this.occupancyElement = element as HTMLDivElement;
        if (params?.occupancy?.show !== false) { section.appendChild(wrapper); }
    }

    /** Creates the variant section container, initially hidden until a material with variants is selected. */
    private SetupVariantSection(): void {
        this.variantSection = this.panel.AddSection('Variant');
        this.variantSection.style.display = 'none';
    }

    /** Builds the phase and tag filter toggle group controls. */
    private SetupFilters(params: MaterialsPanelParams | undefined): void {
        const allPhases = MaterialQuery.GetPhaseOptions();
        const allTags = MaterialQuery.GetTagOptions();

        const phaseFilter = params?.phases?.options
            ? (Array.isArray(params.phases.options) ? params.phases.options : [params.phases.options])
            : null;
        const tagFilter = params?.tags?.options
            ? (Array.isArray(params.tags.options) ? params.tags.options : [params.tags.options])
            : null;

        const phases = phaseFilter
            ? allPhases.filter(p => phaseFilter.includes(p.value as MaterialPhase))
            : allPhases;
        const tags = tagFilter
            ? allTags.filter(t => tagFilter.includes(t.value))
            : allTags;

        const phaseDefault = params?.phases?.default
            ? (Array.isArray(params.phases.default) ? params.phases.default : [params.phases.default]) as string[]
            : phases.map(p => p.value);

        const section = this.panel.AddSection('Filters');

        this.phaseSetting = {
            id: 'mat-phase-filter',
            label: 'Phases',
            type: 'toggleGroup',
            options: [...phases],
            default: phaseDefault,
        };
        const { wrapper: phaseWrapper, element: phaseEl } = ToggleGroupControl.Instance.Build(
            'mat-phase-filter',
            this.phaseSetting
        );
        this.phaseElement = phaseEl as HTMLDivElement;
        if (params?.phases?.show !== false) { section.appendChild(phaseWrapper); }

        this.tagSetting = {
            id: 'mat-tag-filter',
            label: 'Tags',
            type: 'toggleGroup',
            options: [...tags],
            default: [],
        };
        const { wrapper: tagWrapper, element: tagEl } = ToggleGroupControl.Instance.Build(
            'mat-tag-filter',
            this.tagSetting
        );
        this.tagElement = tagEl as HTMLDivElement;
        if (params?.tags?.show !== false) { section.appendChild(tagWrapper); }
    }

    /** Populates the material list, sets the default selection, then binds all controls to their callbacks. */
    private SetupBindings(defaultMaterialId: MaterialId | undefined): void {
        this.UpdateMaterialOptions();
        if (defaultMaterialId !== undefined && this.materialElement) {
            this.materialElement.value = String(defaultMaterialId);
        }

        if (this.occupancyElement && this.occupancySetting) {
            ChoiceControl.Instance.Bind('mat-occupancy', this.occupancyElement, {}, () => {
                if (!this.occupancyElement || !this.occupancySetting) { return; }
                const raw = ChoiceControl.Instance.GetRawValue(this.occupancyElement, this.occupancySetting);
                BrushManager.Instance?.SetOccupancy(raw as MaterialOccupancy);
            }, null);
        }

        if (this.phaseElement) {
            ToggleGroupControl.Instance.Bind('mat-phase-filter', this.phaseElement, {},
                () => { this.UpdateMaterialOptions(); }, null);
        }
        if (this.tagElement) {
            ToggleGroupControl.Instance.Bind('mat-tag-filter', this.tagElement, {},
                () => { this.UpdateMaterialOptions(); }, null);
        }
        if (this.materialElement) {
            SelectControl.Instance.Bind('mat-active', this.materialElement, {}, () => {
                const id = this.GetMaterialId();
                BrushManager.Instance?.SetMaterial(id);
                this.UpdateVariants(id);
            }, null);
        }

        const initialId = this.GetMaterialId();
        BrushManager.Instance?.SetMaterial(initialId);
        this.UpdateVariants(initialId);
    }

    /** Returns the currently selected material ID, or 0 if no material control exists. */
    public GetMaterialId(): MaterialId {
        if (!this.materialElement) { return 0; }
        const v = parseInt(this.materialElement.value, 10);
        return (isNaN(v) ? 0 : v) as MaterialId;
    }

    /** Updates the variant picker for the given material ID. Hidden when the material has no variants. */
    private UpdateVariants(materialId: MaterialId): void {
        if (this.variantElement) {
            this.variantElement.parentElement?.remove();
            this.variantElement = null;
            this.variantSetting = null;
        }
        if (!this.variantSection) { return; }

        const material = Object.values(MaterialRegistry.Materials).find(m => m.id === materialId) ?? null;
        const variants = material?.variants;

        if (!variants || variants.length === 0) {
            this.variantSection.style.display = 'none';
            return;
        }

        this.variantSection.style.display = '';
        this.variantSetting = {
            id: 'mat-variant',
            type: 'choice',
            options: [
                { value: '0', label: 'Default' },
                ...variants.map(v => ({
                    value: String(v.id),
                    label: v.name.charAt(0).toUpperCase() + v.name.slice(1),
                })),
            ],
            default: '0',
        };

        const { wrapper, element } = ChoiceControl.Instance.Build('mat-variant', this.variantSetting);
        this.variantElement = element as HTMLDivElement;
        this.variantSection.appendChild(wrapper);

        ChoiceControl.Instance.Bind('mat-variant', this.variantElement, {}, () => {
            if (!this.variantSetting || !this.variantElement) { return; }
            const raw = ChoiceControl.Instance.GetRawValue(this.variantElement, this.variantSetting);
            BrushManager.Instance?.SetVariant(parseInt(raw, 10));
        }, null);
    }

    /** Rebuilds the material dropdown from the current phase and tag filter selections, preserving the active material if still visible. */
    private UpdateMaterialOptions(): void {
        if (!this.phaseElement || !this.phaseSetting || !this.tagElement || !this.tagSetting || !this.materialElement) { return; }

        const phases = ToggleGroupControl.Instance.GetRawValue(this.phaseElement, this.phaseSetting).split(',').filter(Boolean);
        const tags = ToggleGroupControl.Instance.GetRawValue(this.tagElement, this.tagSetting).split(',').filter(Boolean);
        const options = MaterialQuery.GetFilteredOptions({ phases, tags });

        const currentId = this.GetMaterialId();
        this.materialElement.innerHTML = '';
        for (const opt of options) {
            const el = document.createElement('option');
            el.value = String(opt.value);
            el.textContent = opt.label;
            this.materialElement.appendChild(el);
        }

        const preserved = options.some(o => o.value === currentId);
        if (preserved) {
            this.materialElement.value = String(currentId);
        } else if (options.length > 0) {
            this.materialElement.value = String(options[0].value);
            BrushManager.Instance?.SetMaterial(options[0].value as MaterialId);
            this.UpdateVariants(options[0].value as MaterialId);
        }
    }

    public OnDestroy(): void {
        this.panel.OnDestroy();
    }
}
