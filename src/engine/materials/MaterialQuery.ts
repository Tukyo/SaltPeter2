import type { MaterialName } from './definitions/MaterialIdentity';
import { MaterialRegistry } from './MaterialRegistry';
import { MaterialVisualSchema } from './MaterialVisualSchema';

export interface MaterialFilter {
    phases?: string[];
    tags?: string[];
}

/** Helpers for reading and filtering materials. */
export class MaterialQuery {
    /** Returns all unique non-air material phases, formatted as value/label pairs. */
    public static GetPhaseOptions(): ReadonlyArray<{ value: string; label: string }> {
        const all = Object.values(MaterialRegistry.Materials).filter(m => m.name !== 'air');
        return [...new Set(all.map(m => m.phase))].sort()
            .map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }));
    }

    /** Returns all unique non-air material tags, formatted as value/label pairs. */
    public static GetTagOptions(): ReadonlyArray<{ value: string; label: string }> {
        const all = Object.values(MaterialRegistry.Materials).filter(m => m.name !== 'air');
        return [...new Set(all.flatMap(m => m.tags ?? []))].sort()
            .map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
    }

    /** Decodes the G-channel seed byte from an rgba8unorm identity texture pixel into a 0-based color index. */
    public static DecodeColorIndex(seedByte: number): number {
        return Math.floor((seedByte / 255) * MaterialVisualSchema.GetColorsPerMaterial());
    }

    /** Filters non-air materials by phase and tag requirements, then returns them as sorted value/label pairs. */
    public static GetFilteredOptions(filter: MaterialFilter): ReadonlyArray<{ value: number; label: string }> {
        return (Object.keys(MaterialRegistry.Materials) as MaterialName[])
            .filter(name => name !== 'air')
            .filter(name => {
                const mat = MaterialRegistry.Materials[name];
                if (filter.phases !== undefined && !filter.phases.includes(mat.phase)) { return false; }
                if (filter.tags && filter.tags.length > 0 && (!mat.tags || !filter.tags.every(t => (mat.tags as string[]).includes(t)))) { return false; }
                return true;
            })
            .map(name => ({
                value: MaterialRegistry.Materials[name].id,
                label: name.charAt(0).toUpperCase() + name.slice(1),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }
}