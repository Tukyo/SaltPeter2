import type { GameObject } from '../game_object/GameObject';

import { NitrateProcess } from '../NitrateProcess';

export type ComponentType =
    | 'Blueprint'
    | 'BoxCollider'
    | 'Camera'
    | 'CircleCollider'
    | 'CustomComponent'
    | 'ParticleSystem'
    | 'PixelData'
    | 'PixelBodyCollider'
    | 'Rigidbody'
    | 'Transform'


/** Shared base for all component types. */
export abstract class Component extends NitrateProcess {
    abstract readonly type: ComponentType;
    gameObject: GameObject | null = null;

    /** Binds this component to its owner and registers it with the engine. Called by AddComponent. @internal */
    public Attach(gameObject: GameObject): void {
        this.gameObject = gameObject;
        this.Register();
        this.Awake?.();
        this.OnEnable?.();
    }

    /** Unregisters this component from the engine and clears its owner. Called by RemoveComponent and Destroy. @internal */
    public Detach(): void {
        this.OnDisable?.();
        this.gameObject = null;
        this.Unregister();
    }
}
