// @omitfromdocs
export type UIControlElement =
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLDivElement
    | HTMLButtonElement

export type UISetting =
    | ActionGroupSetting
    | SelectSetting
    | RangeSetting
    | ChoiceSetting
    | ButtonSetting
    | PaletteSetting
    | TextSetting
    | ToggleGroupSetting
    | ToggleListSetting

// @omitfromdocs
export interface ControlEntry {
    element: UIControlElement;
    readout?: HTMLSpanElement;
    sync?: () => void;
    isValue: boolean;
}

export interface BaseSetting {
    id: string;
    label?: string;
    tooltip?: string;
}

export interface RangeSetting extends BaseSetting {
    type: 'range';
    min: number;
    max: number;
    step: number;
    default: number;
    suffix: string;
    decimals: number;
    readout: boolean;
    normalize?: 'percent';
    integer?: boolean;
}

export interface ChoiceSetting extends BaseSetting {
    type: 'choice';
    default: string;
    options: ReadonlyArray<{ value: string; label: string; tooltip?: string }>;
    hideLabel?: boolean;
}

export interface ActionGroupSetting extends BaseSetting {
    type: 'actionGroup';
    options: ReadonlyArray<{ value: string; label: string; icon: string; tooltip?: string }>;
}

export interface ButtonSetting extends BaseSetting {
    type: 'button';
    label: string;
    action: string;
    variant?: 'danger' | 'warn';
}

export interface PaletteSetting extends BaseSetting {
    type: 'palette';
    count: number;
    default: number;
}

export interface SelectSetting extends BaseSetting {
    type: 'select';
    default: number;
    options: ReadonlyArray<{ value: number; label: string }>;
}

export interface TextSetting extends BaseSetting {
    type: 'text';
    placeholder?: string;
    default: string;
}

export interface ToggleGroupSetting extends BaseSetting {
    type: 'toggleGroup';
    options: ReadonlyArray<{ value: string; label: string; tooltip?: string }>;
    default: readonly string[];
}

export interface ToggleListSetting extends BaseSetting {
    type: 'toggleList';
    options: ReadonlyArray<{ value: string; label: string; tooltip?: string }>;
    default: readonly string[];
}
