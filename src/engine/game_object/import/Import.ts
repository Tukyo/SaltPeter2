import type { Component } from '../../component/Component';
import type { GameObject } from '../GameObject';

import { ComponentRegistry } from '../../component/ComponentRegistry';
import { CustomComponent } from '../../component/definitions/custom/Custom';
import { LogManager } from '../../debug/LogManager';
import { NitrateProcess } from '../../NitrateProcess';

interface SerializedGameObject {
    name: string;
    components: Array<Record<string, unknown>>;
}

async function ReadFromAnySource(path: string): Promise<string | null> {
    const fromResources = await window.api.resources.read(path).catch(() => null);
    if (fromResources !== null) { return fromResources; }
    return window.api.userdata.read(path).catch(() => null);
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
    public abstract Run(filename?: string): Promise<boolean>;

    /** Reads and parses a serialized game object from the given path, falling back to the filename provider. Returns null if the file cannot be read or parsed. */
    protected async ReadFileEditor(filename?: string): Promise<SerializedGameObject | null> {
        const path = filename ?? this.filenameProvider?.() ?? null;
        if (!path) { return null; }

        const json = await ReadFromAnySource(path);
        if (json === null) {
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
        const json = await ReadFromAnySource(path);
        if (json === null) {
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

        const fileKeys = new Set(data.components.map(c => {
            const type = c['type'];
            const customType = c['customComponentType'];
            return typeof customType === 'string' ? customType : type;
        }).filter((t): t is string => typeof t === 'string'));

        for (const component of [...go.components]) {
            const key = component instanceof CustomComponent ? component.constructor.name : component.type;
            if (!fileKeys.has(key)) {
                if (component instanceof CustomComponent) {
                    go.RemoveComponent(component.constructor as new () => Component);
                } else {
                    const ComponentClass = ComponentRegistry.GetByType(component.type);
                    if (ComponentClass) { go.RemoveComponent(ComponentClass as new () => Component); }
                }
            }
        }

        for (const raw of data.components) {
            const typeName = raw['type'];
            if (typeof typeName !== 'string') { continue; }
            const customTypeName = raw['customComponentType'];
            const isCustom = typeName === 'CustomComponent' && typeof customTypeName === 'string';

            let component: Component | undefined = isCustom
                ? go.components.find(c => c instanceof CustomComponent && c.constructor.name === customTypeName)
                : go.components.find(c => c.type === typeName);

            if (!component) {
                const ComponentClass = isCustom
                    ? ComponentRegistry.GetByClassName(customTypeName as string)
                    : ComponentRegistry.GetByType(typeName);
                if (ComponentClass) {
                    component = go.AddComponent(ComponentClass as new () => Component);
                } else {
                    LogManager.Instance?.LogWarning({
                        text: `Unknown component type '${customTypeName ?? typeName}' on ${go.name} — skipped.`,
                        options: { tags: ['Import'] },
                    });
                }
            }

            if (!component) { continue; }
            for (const [key, value] of Object.entries(raw)) {
                if (key === 'type' || key === 'customComponentType') { continue; }
                (component as unknown as Record<string, unknown>)[key] = value;
            }
        }
    }

    public OnDestroy(): void {
        this.gameObjectProvider = null;
        this.filenameProvider = null;
    }
}
