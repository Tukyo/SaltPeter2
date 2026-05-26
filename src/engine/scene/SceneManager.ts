import type { SceneEntry } from './Scene';

import { Loader } from '../ui/Loader';
import { Modal } from '../ui/Modal';
import { NitrateEngine } from '../NitrateEngine';

/**
 * Bootstraps the application and manages scene transitions.
 *
 * Constructed once at app startup with a list of {@link SceneEntry} objects — renders a scene picker UI and launches the selected scene.
 */
export class SceneManager {
    private static registry: SceneEntry[] = [];
    private static dirty: boolean = false;
    private readonly element: HTMLDivElement;

    /** Marks the scene as dirty */
    public static MarkDirty(): void { SceneManager.dirty = true; }
    /** Returns true if a scene is dirty */
    public static IsDirty(): boolean { return SceneManager.dirty; }
    /** Clears the dirty flag. */
    public static ClearDirty(): void { SceneManager.dirty = false; }

    constructor(scenes: SceneEntry[]) {
        SceneManager.registry = scenes;
        this.element = document.createElement('div');
        this.element.id = 'landing-menu';

        const box = document.createElement('div');
        box.className = 'landing-box';

        const title = document.createElement('h1');
        title.className = 'landing-title';
        title.textContent = 'Scene Select';

        box.appendChild(title);

        for (const entry of scenes) {
            const button = document.createElement('button');
            button.className = 'landing-button';
            button.textContent = entry.label;
            button.addEventListener('click', () => { void this.Launch(entry); });
            box.appendChild(button);
        }

        this.element.appendChild(box);
        document.body.appendChild(this.element);

        NitrateEngine.Run();
    }

    /**
     * Exits the scene.
     * 
     * Stops the nitrate engine, clearing the dirty state and waiting for all OnDestroy processes in the engine to finish.
     */
    public static async ExitScene(): Promise<void> {
        SceneManager.ClearDirty();
        NitrateEngine.Stop();
        await NitrateEngine.Destroy();
        new SceneManager(SceneManager.registry);
    }

    /** 
     * Launches a scene.
     * 
     * Clears any lingering dirty state, and destroys any lingering process.
     */
    private async Launch(entry: SceneEntry): Promise<void> {
        this.Destroy();
        SceneManager.ClearDirty();
        await NitrateEngine.Destroy();

        const loading = Modal.Show(new Loader().element);

        try {
            const scene = entry.factory();
            await scene.Init();
            NitrateEngine.Start();
        } catch (error) {
            console.error(`Failed to launch scene: ${entry.label}`, error);
        } finally {
            loading.close();
        }
    }

    private Destroy(): void {
        this.element.remove();
    }
}
