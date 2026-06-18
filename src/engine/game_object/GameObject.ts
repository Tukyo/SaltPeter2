import type { Component } from '../component/Component';
import type { Vec2 } from '../definitions/Primitives';

import { GameObjectManager } from './GameObjectManager';

// @omitfromdocs
export type GameObjectId = number;

/**
 * A scene entity built from components. Add {@link GameObjectManager} to your scene to use {@link Instantiate} and {@link Destroy}.
 *
 * ```ts
 * const go = await Nitrate.GameObject.Instantiate(guid, { x: 50, y: 100 });
 * go?.Destroy();
 * ```
 */
export class GameObject {
    readonly id: GameObjectId;
    name: string;
    active: boolean = true;
    components: Component[] = [];

    constructor(id: GameObjectId, name: string) {
        this.id = id;
        this.name = name;
    }

    /**
     * Resolves a prefab by GUID, spawns it at the given position, and registers it with the GameObjectManager.
     * Returns null if the manager is not initialized or the GUID cannot be resolved.
     */
    public static async Instantiate(guid: string, pos: Vec2): Promise<GameObject | null> {
        return GameObjectManager.Instance?.Instantiate(guid, pos) ?? null;
    }

    /** Removes this GameObject from the scene and unregisters it from the GameObjectManager. */
    public Destroy(): void { GameObjectManager.Instance?.Destroy(this.id); }

    /** Creates and attaches a new component of the given type. Returns the new instance. */
    public AddComponent<T extends Component>(Component: new () => T): T {
        const component = new Component();
        component.Attach(this);
        GameObjectManager.Instance?.QueueStart(component);
        this.components.push(component);
        return component;
    }

    /** Returns the first attached component of the given type, or null if none exists. */
    public GetComponent<T extends Component>(Component: new () => T): T | null {
        for (const component of this.components) {
            if (component instanceof Component) return component;
        }
        return null;
    }

    /** Detaches and removes all components of the given type. */
    public RemoveComponent<T extends Component>(Component: new () => T): void {
        const removed = this.components.filter(c => c instanceof Component);
        for (const component of removed) { component.Detach(); }
        this.components = this.components.filter(c => !(c instanceof Component));
    }
}
