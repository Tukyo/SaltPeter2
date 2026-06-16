import { Import } from './Import';
import { LogManager } from '../../debug/LogManager';

/**
 * Reads a `.gameobject.json` file and hydrates the target game object
 * with the deserialised component data.
 */
export class ImportGameObject extends Import {
    public static Instance: ImportGameObject | null = null;

    constructor() {
        super();
        ImportGameObject.Instance = this;
    }

    /**
     * Reads the file and hydrates the target game object.
     * Accepts an optional filename override; falls back to the filename provider.
     * @internal
     */
    public async Run(filename?: string): Promise<boolean> {
        const go = this.gameObjectProvider?.() ?? null;
        if (!go) {
            LogManager.Instance?.LogWarning({
                text: 'ImportGameObject skipped: no game object target.',
                options: { tags: ['GameObject', 'Import'] }
            });
            return false;
        }
        const data = await this.ReadFileEditor(filename);
        if (!data) { return false; }
        Import.HydrateGameObject(go, data);
        LogManager.Instance?.Log({
            text: `Imported game object '${go.name}'.`,
            options: { tags: ['GameObject', 'Import'] }
        });
        return true;
    }

    public OnDestroy(): void {
        super.OnDestroy();
        if (ImportGameObject.Instance === this) {
            ImportGameObject.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared ImportGameObject singleton instance.',
                options: { tags: ['GameObject', 'NitrateProcessDestroy'] }
            });
        }
    }
}
