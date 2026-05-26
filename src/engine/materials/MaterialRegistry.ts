import type { MaterialDefinition } from './definitions/MaterialModel';
import type { MaterialName } from './definitions/MaterialIdentity';

const modules = import.meta.glob('./definitions/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

/**
 * Auto-discovers and indexes every material definition in the `definitions/` directory.
 *
 * Uses `import.meta.glob` to eagerly load all `.ts` files under `definitions/`, then
 * walks every export looking for objects with `name` and `id` properties. No manual
 * registration is needed — adding a definition file is enough.
 */
export class MaterialRegistry {
    public static readonly Materials: Record<MaterialName, MaterialDefinition> = MaterialRegistry.build();

    private static build(): Record<MaterialName, MaterialDefinition> {
        const materials = {} as Record<MaterialName, MaterialDefinition>;

        for (const module of Object.values(modules)) {
            for (const exported of Object.values(module)) {
                if (exported && typeof exported === 'object' && 'name' in exported && 'id' in exported) {
                    const mat = exported as MaterialDefinition;
                    materials[mat.name] = mat;
                }
            }
        }

        return materials;
    }
}
