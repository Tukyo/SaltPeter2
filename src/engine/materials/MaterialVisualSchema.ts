import type { MaterialName } from './definitions/MaterialIdentity';
import { MaterialRegistry } from './MaterialRegistry';

/**
 * Declares the color buffer layout constants for per-material visual data.
 *
 * Drives both {@link MaterialVisualBuffer} (data packing) and {@link ShaderFactory}
 * (WGSL struct generation) so both sides stay in sync from a single source of truth.
 */
export class MaterialVisualSchema {
    private static readonly colorsPerMaterial = 4;
    private static _maxVariants: number | undefined;

    /** Returns the number of color slots per material or variant (always 4). @internal */
    public static GetColorsPerMaterial(): number { return MaterialVisualSchema.colorsPerMaterial; }

    /** Returns the highest variant count across all registered materials, computed once and cached. @internal */
    public static GetMaxVariants(): number {

        if (MaterialVisualSchema._maxVariants === undefined) {
            const names = Object.keys(MaterialRegistry.Materials) as MaterialName[];
            MaterialVisualSchema._maxVariants = Math.max(
                0,
                ...names.map(n => MaterialRegistry.Materials[n].variants?.length ?? 0)
            );
        }
        return MaterialVisualSchema._maxVariants;
    }

    /** Returns the total color slots per material entry — base colors plus all variant color sets. @internal */
    public static GetTotalColorsPerMaterial(): number { return (1 + MaterialVisualSchema.GetMaxVariants()) * MaterialVisualSchema.colorsPerMaterial; }
}
