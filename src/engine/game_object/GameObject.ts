import type { AnyComponent } from '../component/Component';

// @omitfromdocs
export type GameObjectId = number;

/**
 * Named container that holds a collection of components defining its behaviour and data.
 * 
 * ```ts
 * const obj = new Nitrate.GameObject(id, 'Player');
 * const transform = obj.AddComponent(Transform);
 * ```
 */
export class GameObject {
    readonly id: GameObjectId;
    name: string;
    active: boolean = true;
    components: AnyComponent[] = [];

    constructor(id: GameObjectId, name: string) {
        this.id = id;
        this.name = name;
    }

    /** Creates and attaches a new component of the given type. Returns the new instance. */
    public AddComponent<T extends AnyComponent>(Component: new () => T): T {
        const component = new Component();
        this.components.push(component);
        return component;
    }

    /** Returns the first attached component of the given type, or null if none exists. */
    public GetComponent<T extends AnyComponent>(Component: new () => T): T | null {
        for (const component of this.components) {
            if (component instanceof Component) return component;
        }
        return null;
    }

    /** Detaches and removes all components of the given type. */
    public RemoveComponent<T extends AnyComponent>(Component: new () => T): void {
        this.components = this.components.filter(c => !(c instanceof Component));
    }
}
