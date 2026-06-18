import type { Component } from '../../component/Component';
import type { ComponentField } from './ComponentField';

const modules = import.meta.glob('./**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

// @omitfromdocs
export type ComponentFieldConstructor = (new (component: Component, onRemove: () => void) => ComponentField) & { forType: string };

/** Maps component type strings to their inspector field constructors, built once at module load. */
export class ComponentFieldRegistry {
    public static readonly Fields: ReadonlyMap<string, ComponentFieldConstructor> = ComponentFieldRegistry.Build();

    private static Build(): Map<string, ComponentFieldConstructor> {
        const result = new Map<string, ComponentFieldConstructor>();

        for (const module of Object.values(modules)) {
            for (const exported of Object.values(module)) {
                if (typeof exported === 'function' && 'forType' in exported && !result.has((exported as ComponentFieldConstructor).forType)) {
                    result.set((exported as ComponentFieldConstructor).forType, exported as ComponentFieldConstructor);
                }
            }
        }

        return result;
    }
}
