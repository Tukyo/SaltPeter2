import type { RendererWebGPU } from "../rendering/RendererWebGPU";

import { NitrateProcess } from "../NitrateProcess";
import { SceneManager } from "./SceneManager";

export interface SceneEntry {
    label: string;
    factory: () => Scene;
}

/**
 * Base class for all scenes.
 *
 * Subclasses implement `Init()` to set up processes and state. Transitions between scenes
 * are handled by {@link SceneManager} — scenes never load themselves.
 */
export abstract class Scene extends NitrateProcess {
    constructor() {
        super();
        this.Register();
    }

    // @omitfromdocs
    public abstract InitRenderer(): Promise<RendererWebGPU>;

    /** Marks the scene as dirty, it has been edited or mutated from it's original state. */
    protected MarkDirty(): void { SceneManager.MarkDirty(); }
}