import type { AnyComponent } from './Component';

const modules = import.meta.glob('./definitions/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

// @omitfromdocs
export type ComponentConstructor = (new () => AnyComponent) & { label: string };

/** Auto-discovers and registers all component definitions from the definitions directory. */
export class ComponentRegistry {
    public static readonly Components: ReadonlyArray<ComponentConstructor> = ComponentRegistry.Build();

    private static Build(): ComponentConstructor[] {
        const result: ComponentConstructor[] = [];

        for (const module of Object.values(modules)) {
            for (const exported of Object.values(module)) {
                if (typeof exported === 'function' && 'label' in exported && !result.includes(exported as ComponentConstructor)) {
                    result.push(exported as ComponentConstructor);
                }
            }
        }

        return result;
    }
}
