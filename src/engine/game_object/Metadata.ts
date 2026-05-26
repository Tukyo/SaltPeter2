import type { Size2D, Vec2 } from "../definitions/Primitives";

import { LogManager } from "../debug/LogManager";

type AssetType = 'gameobject' | 'blueprint';

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

    /** Reads and parses the .meta file for the given asset path. Returns null if the file is missing or unparseable. @internal */
    public static async Read(assetPath: string): Promise<AssetMetadata | null> {
        const metaPath = Metadata.GetMetaPath(assetPath);
        const json = await window.api.resources.read(metaPath).catch(() => null);
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
