import type { Component } from './Component';

import { CustomComponent } from './definitions/custom/Custom';

const engineModules = import.meta.glob('./definitions/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;
const customModules = import.meta.glob('../../game/scripts/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

// @omitfromdocs
export type ComponentConstructor = (new () => Component) & { label: string };

/** Auto-discovers and registers all component definitions from the definitions directory and all custom components. */
export class ComponentRegistry {
    public static readonly Components: ReadonlyArray<ComponentConstructor> = ComponentRegistry.Build();
    public static readonly byType: Map<string, ComponentConstructor> = ComponentRegistry.BuildTypeMap();

    private static Build(): ComponentConstructor[] {
        return [
            ...ComponentRegistry.RegisterEngineComponents(),
            ...ComponentRegistry.RegisterCustomComponents(),
        ];
    }

    private static RegisterEngineComponents(): ComponentConstructor[] {
        const seen = new Set<unknown>();
        const result: ComponentConstructor[] = [];
        for (const module of Object.values(engineModules)) {
            for (const exported of Object.values(module)) {
                if ( // Skip CustomComponent
                    typeof exported === 'function' &&
                    exported !== CustomComponent &&
                    'label' in exported &&
                    !seen.has(exported)
                ) {
                    seen.add(exported);
                    result.push(exported as ComponentConstructor);
                }
            }
        }
        return result;
    }

    private static RegisterCustomComponents(): ComponentConstructor[] {
        const seen = new Set<unknown>();
        const result: ComponentConstructor[] = [];
        for (const module of Object.values(customModules)) {
            for (const exported of Object.values(module)) {
                if (
                    typeof exported === 'function' &&
                    exported !== CustomComponent &&
                    (exported as { prototype: unknown }).prototype instanceof CustomComponent &&
                    !seen.has(exported)
                ) {
                    seen.add(exported);
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
    public static GetByType(type: string): ComponentConstructor | undefined { return ComponentRegistry.byType.get(type); }

    /** Returns the component constructor whose class name matches the given string, or undefined if not found. Used for custom component deserialization. @internal */
    public static GetByClassName(className: string): ComponentConstructor | undefined {
        return ComponentRegistry.Components.find(C => C.name === className);
    }
}
