import type { AssetType } from '../Metadata';
import type { Size2D, Vec2 } from '../../definitions/Primitives';
import type { GameObject } from '../GameObject';

import { CustomComponent } from '../../component/definitions/custom/Custom';
import { LogManager } from '../../debug/LogManager';
import { Metadata } from '../Metadata';
import { Modal } from '../../ui/Modal';
import { NitrateProcess } from '../../NitrateProcess';
import { Resources } from '../../ui/Resources';

/** Abstract base for game object export. Subclasses implement Run() to define the export target and format. */
export abstract class Export extends NitrateProcess {
    // @omitfromdocs
    protected gameObjectProvider: (() => GameObject | null) | null = null;

    /** Sets the function used to retrieve the game object to export. */
    // @omitfromdocs
    public SetGameObjectProvider(fn: () => GameObject | null): void { this.gameObjectProvider = fn; }

    /** Executes the export. Returns the written filename on success, null if cancelled or failed. @internal */
    public abstract Run(): Promise<string | null>;

    /** Returns the output filename for the given game object. Defaults to `{name}.json`. */
    protected GetFilename(go: GameObject): string { return go.name + '.json'; }

    /** Serializes the game object and writes both the asset JSON and its .meta file to disk. Preserves the existing GUID on re-export. */
    protected async WriteFile(go: GameObject, type: AssetType, editor: { size: Size2D, pos?: Vec2 }): Promise<string | null> {
        const filename = this.GetFilename(go);
        const dir = filename.includes('/') ? filename.split('/').slice(0, -1).join('/') : null;
        if (dir) { await window.api.assets.mkdir(dir).catch(() => null); }

        const existing = await window.api.assets.read(filename).catch(() => null);
        if (existing !== null) {
            const confirmed = await Modal.Confirm({ title: `${filename} already exists. Overwrite?`, confirmLabel: 'Overwrite' });
            if (!confirmed) { return null; }
        }

        const components = go.components.map(c => {
            const serialized: Record<string, unknown> = { enabled: c.enabled };
            if (c instanceof CustomComponent) {
                serialized['customComponentType'] = c.constructor.name;
                for (const key of Object.keys(c)) {
                    if (key === 'gameObject' || key === '_enabled') { continue; }
                    const value = (c as unknown as Record<string, unknown>)[key];
                    if (value === null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
                        serialized[key] = value;
                    }
                }
            } else {
                for (const key of Object.keys(c)) {
                    if (key === 'gameObject' || key === '_enabled') { continue; }
                    serialized[key] = (c as unknown as Record<string, unknown>)[key];
                }
            }
            return serialized;
        });
        const output = { name: go.name, components };
        try {
            await window.api.assets.write(filename, JSON.stringify(output, null, 2));
        } catch {
            LogManager.Instance?.LogWarning({
                text: `Failed to write ${filename}.`,
                options: { tags: ['Export'] }
            });
            return null;
        }

        const meta = await Metadata.GenerateOrPreserve(filename, type, editor);
        try {
            await window.api.assets.write(Metadata.GetMetaPath(filename), JSON.stringify(meta, null, 2));
        } catch {
            LogManager.Instance?.LogWarning({
                text: `Failed to write meta for ${filename}.`,
                options: { tags: ['Export'] }
            });
            return null;
        }

        Metadata.InvalidateGuidCache();
        void Resources.Instance?.InvalidateFile(filename);
        LogManager.Instance?.Log({
            text: `Exported ${filename}.`,
            options: { tags: ['Export'] }
        });
        return filename;
    }

    public OnDestroy(): void {
        this.gameObjectProvider = null;
    }
}
