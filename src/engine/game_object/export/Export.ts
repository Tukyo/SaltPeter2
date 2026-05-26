import type { AssetMetadata } from '../Metadata';
import type { GameObject } from '../GameObject';

import { LogManager } from '../../debug/LogManager';
import { Metadata } from '../Metadata';
import { Modal } from '../../ui/Modal';
import { NitrateProcess } from '../../NitrateProcess';

/** Abstract base for game object export. Subclasses implement Run() to define the export target and format. */
export abstract class Export extends NitrateProcess {
    protected gameObjectProvider: (() => GameObject | null) | null = null;

    /** Sets the function used to retrieve the game object to export. */
    public SetGameObjectProvider(fn: () => GameObject | null): void { this.gameObjectProvider = fn; }

    /** Executes the export. Implemented by subclasses. @internal */
    public abstract Run(): Promise<void>;

    /** Returns the output filename for the given game object. Defaults to `{name}.json`. */
    protected GetFilename(go: GameObject): string { return go.name + '.json'; }

    /** Serializes the game object and writes both the asset JSON and its .meta file to disk. */
    protected async WriteFile(go: GameObject, meta: AssetMetadata): Promise<void> {
        const filename = this.GetFilename(go);
        const dir = filename.includes('/') ? filename.split('/').slice(0, -1).join('/') : null;
        if (dir) { await window.api.resources.mkdir(dir).catch(() => null); }

        const existing = await window.api.resources.read(filename).catch(() => null);
        if (existing !== null) {
            const confirmed = await Modal.Confirm({ title: `${filename} already exists. Overwrite?`, confirmLabel: 'Overwrite' });
            if (!confirmed) { return; }
        }

        const output = { name: go.name, components: go.components };
        try {
            await window.api.resources.write(filename, JSON.stringify(output, null, 2));
        } catch (error) {
            LogManager.Instance?.LogWarning({
                text: `Failed to write ${filename}.`,
                options: { tags: ['Export'] }
            });
            return;
        }

        try {
            await window.api.resources.write(Metadata.GetMetaPath(filename), JSON.stringify(meta, null, 2));
        } catch (error) {
            LogManager.Instance?.LogWarning({
                text: `Failed to write meta for ${filename}.`,
                options: { tags: ['Export'] }
            });
            return;
        }

        LogManager.Instance?.Log({
            text: `Exported ${filename}.`,
            options: { tags: ['Export'] }
        });
    }

    public OnDestroy(): void {
        this.gameObjectProvider = null;
    }
}
