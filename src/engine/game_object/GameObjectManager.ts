import type { GameObjectId } from "./GameObject";
import type { Vec2 } from "../definitions/Primitives";

import { Component } from "../component/Component";
import { GameObject } from "./GameObject";
import { Import } from "./import/Import";
import { Metadata } from "./Metadata";
import { Transform } from "../component/definitions/transform/Transform";
import { LogManager } from "../debug/LogManager";
import { NitrateProcess } from "../NitrateProcess";

/**
 * Tracks all active {@link GameObject} instances and manages their lifecycle.
 * 
 * Scenes that contain GameObjects require a GameObjectManager.
 *
 * ```ts
 * new Nitrate.GameObjectManager();
 * ```
 */
export class GameObjectManager extends NitrateProcess {
    public static Instance: GameObjectManager | null = null;

    private readonly objects: Map<GameObjectId, GameObject> = new Map();
    private readonly pendingStart: Component[] = [];
    private nextId: GameObjectId = 1; // Starts at 1 (0 is unowned)

    constructor() {
        super();
        this.Register();

        GameObjectManager.Instance = this;
    }

    /**
     * Resolves a GUID to its asset path, loads and hydrates the game object, sets its
     * spawn position, and registers it. Returns null if the GUID cannot be resolved
     * or the importer is unavailable. @internal
     */
    public async Instantiate(guid: string, pos: Vec2): Promise<GameObject | null> {
        const path = await Metadata.ResolveGuid(guid);
        if (!path) { return null; }

        const id = this.nextId++;
        const gameObject = new GameObject(id, guid);
        this.objects.set(id, gameObject);

        await Import.HydrateFromFile(gameObject, path);

        const transform = gameObject.GetComponent(Transform);
        if (transform) { transform.position = pos; }

        return gameObject;
    }

    /** Removes a GameObject from the registry by ID. @internal */
    public Destroy(id: GameObjectId): void {
        const gameObject = this.objects.get(id);
        if (gameObject) {
            for (const component of gameObject.components) {
                component.Detach();
            }
        }
        this.objects.delete(id);
    }

    /** Returns the registered GameObject for the given ID, or null if not found. @internal */
    public Get(id: GameObjectId): GameObject | null { return this.objects.get(id) ?? null; }

    /** Queues a component to have Start called on the next frame. Called by AddComponent. @internal */
    public QueueStart(component: Component): void { this.pendingStart.push(component); }

    public Update(): void {
        if (this.pendingStart.length > 0) {
            for (const component of this.pendingStart) { component.Start?.(); }
            this.pendingStart.length = 0;
        }
    }

    /** Returns an iterator over all registered GameObjects. @internal */
    public GetAll(): IterableIterator<GameObject> { return this.objects.values(); }

    public OnResize(): void {
        for (const id of [...this.objects.keys()]) { this.Destroy(id); }
        this.nextId = 1;
        LogManager.Instance?.Log({
            text: 'GameObjectManager OnResize.',
            options: { tags: ['Resize', 'GameObject'] }
        });
    }

    public OnDestroy(): void {
        for (const id of [...this.objects.keys()]) { this.Destroy(id); }
        this.nextId = 1;
        if (GameObjectManager.Instance === this) {
            GameObjectManager.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared GameObject singleton instance.',
                options: { tags: ['GameObject', 'NitrateProcessDestroy'] }
            });
        }
    }
}
