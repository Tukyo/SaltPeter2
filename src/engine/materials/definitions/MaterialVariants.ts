import type { Color } from '../../definitions/Primitives';

export interface MaterialVariant {
    id: number;
    name: string;
    colors: readonly [Color, Color, Color, Color];
    overrides?: MaterialVariantOverrides;
}

export interface MaterialVariantOverrides {
    restingTemperature?: number;
    restingStrength?: number;
    specificHeat?: number;
    density?: number;
}
