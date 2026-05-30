import type { AnyComponent } from '../../component/Component';
import type { GameObject } from '../GameObject';

import { ComponentRegistry } from '../../component/ComponentRegistry';
import { LogManager } from '../../debug/LogManager';
import { NitrateProcess } from '../../NitrateProcess';

interface SerializedGameObject {
    name: string;
    components: Array<Record<string, unknown>>;
}

/** Abstract base for game object import. Subclasses implement Run() to define the import source and target. */
export abstract class Import extends NitrateProcess {
    protected gameObjectProvider: (() => GameObject | null) | null = null;
    protected filenameProvider: (() => string | null) | null = null;

    /** Sets the function used to retrieve the target game object to hydrate. @internal */
    public SetGameObjectProvider(fn: () => GameObject | null): void { this.gameObjectProvider = fn; }

    /** Sets the function used to retrieve the filename to import from. @internal*/
    public SetFilenameProvider(fn: () => string | null): void { this.filenameProvider = fn; }

    /** Executes the import. Implemented by subclasses. @internal */
    public abstract Run(filename?: string): Promise<void>;

    /** Reads and parses a serialized game object from the given path, falling back to the filename provider. Returns null if the file cannot be read or parsed. */
    protected async ReadFileEditor(filename?: string): Promise<SerializedGameObject | null> {
        const path = filename ?? this.filenameProvider?.() ?? null;
        if (!path) { return null; }

        let json: string;
        try {
            json = await window.api.resources.read(path);
        } catch (error) {
            LogManager.Instance?.LogWarning({
                text: `Failed to read ${path}.`,
                options: { tags: ['Import'] }
            });
            return null;
        }

        try {
            return JSON.parse(json) as SerializedGameObject;
        } catch (error) {
            LogManager.Instance?.LogWarning({
                text: `Failed to parse ${path}.`,
                options: { tags: ['Import'] }
            });
            return null;
        }
    }

    /** Reads and parses a serialized game object from an explicit path. Returns null if the file cannot be read or parsed. @internal */
    public static async ReadFile(path: string): Promise<SerializedGameObject | null> {
        let json: string;
        try {
            json = await window.api.resources.read(path);
        } catch {
            LogManager.Instance?.LogWarning({
                text: `Failed to read ${path}.`,
                options: { tags: ['Import'] }
            });
            return null;
        }
        try {
            return JSON.parse(json) as SerializedGameObject;
        } catch {
            LogManager.Instance?.LogWarning({
                text: `Failed to parse ${path}.`,
                options: { tags: ['Import'] }
            });
            return null;
        }
    }

    /** Reads a game object file by path and hydrates the given GameObject with its component data. @internal */
    public static async HydrateFromFile(go: GameObject, path: string): Promise<void> {
        const data = await Import.ReadFile(path);
        if (!data) { return; }
        Import.HydrateGameObject(go, data);
    }

    /** Applies serialized component data to the given game object, adding unknown components from the registry and patching their fields. */
    protected static HydrateGameObject(go: GameObject, data: SerializedGameObject): void {
        go.name = data.name;
        for (const raw of data.components) {
            const typeName = raw['type'];
            if (typeof typeName !== 'string') { continue; }
            let component: AnyComponent | undefined = go.components.find(c => c.type === typeName);
            if (!component) {
                const ComponentClass = ComponentRegistry.GetByType(typeName);
                if (ComponentClass) {
                    component = go.AddComponent(ComponentClass as new () => AnyComponent);
                } else {
                    LogManager.Instance?.LogWarning({
                        text: `Unknown component type '${typeName}' on ${go.name} — skipped.`,
                        options: { tags: ['Import'] },
                    });
                }
            }
            if (!component) { continue; }
            for (const [key, value] of Object.entries(raw)) {
                if (key === 'type') { continue; }
                (component as unknown as Record<string, unknown>)[key] = value;
            }
        }
    }

    public OnDestroy(): void {
        this.gameObjectProvider = null;
        this.filenameProvider = null;
    }
}
