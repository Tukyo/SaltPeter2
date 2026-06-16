import type { OreDefinition } from "./OreModel";
import type { OreName } from "./OreIdentity";

const modules = import.meta.glob('./definitions/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

/**
 * Auto-discovers and indexes every ore definition in the `definitions/` directory.
 * Uses `import.meta.glob` to eagerly load all `.ts` files, then walks every export
 * looking for objects with `name` and `id` properties.
 */
export class OreRegistry {
    public static readonly Ores: Record<OreName, OreDefinition> = OreRegistry.build();

    private static build(): Record<OreName, OreDefinition> {
        const ores = {} as Record<OreName, OreDefinition>;

        for (const module of Object.values(modules)) {
            for (const exported of Object.values(module)) {
                if (exported && typeof exported === 'object' && 'name' in exported && 'id' in exported) {
                    const ore = exported as OreDefinition;
                    ores[ore.name] = ore;
                }
            }
        }

        return ores;
    }
}