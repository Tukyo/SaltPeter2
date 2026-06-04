import type { Size2D, Vec2 } from "../definitions/Primitives";

import { LogManager } from "../debug/LogManager";

// @omitfromdocs
export type AssetType = 'gameobject' | 'blueprint';

// @omitfromdocs
export interface AssetMetadata {
    guid: string;
    type: AssetType;
    editor: {
        size: Size2D; // Stores the editor canvas size
        pos?: Vec2; // Stores the position of the object within the canvas if provided
    };
}

/** Utility class for reading, writing, and generating asset .meta files. */
export class Metadata {
    private static guidCache: Map<string, string> | null = null;
    
    /** Returns the .meta file path for the given asset path, stripping the .json extension if present. @internal */
    public static GetMetaPath(assetPath: string): string {
        const base = assetPath.endsWith('.json') ? assetPath.slice(0, -5) : assetPath;
        return base + '.meta';
    }

    /** Generates a fresh AssetMetadata object with a new GUID for the given asset type and editor state. @internal */
    public static Generate(type: AssetType, editor: { size: Size2D, pos?: Vec2 }): AssetMetadata {
        const metaData: AssetMetadata = {
            guid: crypto.randomUUID(),
            type,
            editor: {
                size: editor.size,
                pos: editor.pos,
            },
        };
        LogManager.Instance?.Log({
            text: `Generated ${type} metadata.`,
            options: { tags: ['Metadata'] }
        });
        return metaData;
    }

    /**
     * Generates metadata for the given asset, preserving the existing GUID if a .meta file
     * already exists at that path. Use on re-export so stable GUID references don't break. @internal
     */
    public static async GenerateOrPreserve(
        assetPath: string,
        type: AssetType,
        editor: { size: Size2D, pos?: Vec2 }
    ): Promise<AssetMetadata> {
        const metaPath = Metadata.GetMetaPath(assetPath);
        const existingJson = await window.api.assets.read(metaPath).catch(() => null);
        const meta = Metadata.Generate(type, editor);
        if (existingJson !== null) {
            try {
                const existing = JSON.parse(existingJson) as AssetMetadata;
                meta.guid = existing.guid;
                LogManager.Instance?.Log({
                    text: `Preserved GUID for ${assetPath}.`,
                    options: { tags: ['Metadata'] }
                });
            } catch { /* ignore malformed existing meta */ }
        }
        return meta;
    }

    /**
     * Scans all resources, reads their .meta files, and returns the asset path for the given GUID.
     * Result is cached after the first call. Returns null if no match is found. @internal
     */
    public static async ResolveGuid(guid: string): Promise<string | null> {
        if (!Metadata.guidCache) {
            Metadata.guidCache = new Map();
            const [resourcePaths, userdataPaths] = await Promise.all([
                window.api.resources.list().catch(() => [] as string[]),
                window.api.userdata.list().catch(() => [] as string[]),
            ]);
            for (const path of [...resourcePaths, ...userdataPaths]) {
                if (path.endsWith('/')) { continue; }
                const meta = await Metadata.Read(path);
                if (meta) { Metadata.guidCache.set(meta.guid, path); }
            }
        }
        return Metadata.guidCache.get(guid) ?? null;
    }

    /** Invalidates the GUID cache. Call after any resource is created, renamed, or deleted. @internal */
    public static InvalidateGuidCache(): void {
        Metadata.guidCache = null;
    }

    /** Reads and parses the .meta file for the given asset path. Returns null if the file is missing or unparseable. @internal */
    public static async Read(assetPath: string): Promise<AssetMetadata | null> {
        const metaPath = Metadata.GetMetaPath(assetPath);
        const fromResources = await window.api.resources.read(metaPath).catch(() => null);
        const json = fromResources ?? await window.api.userdata.read(metaPath).catch(() => null);
        if (json === null) { return null; }

        try {
            const meta = JSON.parse(json) as AssetMetadata;
            LogManager.Instance?.Log({
                text: `Read metadata for ${assetPath}.`,
                options: { tags: ['Metadata'] }
            });
            return meta;
        } catch {
            LogManager.Instance?.LogWarning({
                text: `Failed to parse metadata for ${assetPath}.`,
                options: { tags: ['Metadata'] }
            });
            return null;
        }
    }
}
