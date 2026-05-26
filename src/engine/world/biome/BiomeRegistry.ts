import type { BiomeDefinition } from "./definitions/BiomeModel";
import type { BiomeName } from "./definitions/BiomeIdentity";

const modules = import.meta.glob('./definitions/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

/**
 * Auto-discovers and indexes every biome definition in the `definitions/` directory.
 * Uses `import.meta.glob` to eagerly load all `.ts` files, then walks every export
 * looking for objects with `name` and `id` properties.
 */
export class BiomeRegistry {
    public static readonly Biomes: Record<BiomeName, BiomeDefinition> = BiomeRegistry.build();

    private static build(): Record<BiomeName, BiomeDefinition> {
        const biomes = {} as Record<BiomeName, BiomeDefinition>;

        for (const module of Object.values(modules)) {
            for (const exported of Object.values(module)) {
                if (exported && typeof exported === 'object' && 'name' in exported && 'id' in exported) {
                    const biome = exported as BiomeDefinition;
                    biomes[biome.name] = biome;
                }
            }
        }

        return biomes;
    }
}