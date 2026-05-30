import type { AnyComponent } from './Component';

const modules = import.meta.glob('./definitions/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

// @omitfromdocs
export type ComponentConstructor = (new () => AnyComponent) & { label: string };

/** Auto-discovers and registers all component definitions from the definitions directory. */
export class ComponentRegistry {
    public static readonly Components: ReadonlyArray<ComponentConstructor> = ComponentRegistry.Build();
    private static readonly byType: Map<string, ComponentConstructor> = ComponentRegistry.BuildTypeMap();

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

    private static BuildTypeMap(): Map<string, ComponentConstructor> {
        const map = new Map<string, ComponentConstructor>();
        for (const C of ComponentRegistry.Components) {
            const instance = new C();
            map.set(instance.type, C);
        }
        return map;
    }

    /** Returns the component constructor whose serialized type matches the given string, or undefined if not found. @internal */
    public static GetByType(type: string): ComponentConstructor | undefined {
        return ComponentRegistry.byType.get(type);
    }
}
