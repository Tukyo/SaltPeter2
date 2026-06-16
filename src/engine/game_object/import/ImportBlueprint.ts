import { Import } from './Import';
import { LogManager } from '../../debug/LogManager';

/**
 * Reads a `.blueprint.json` file and hydrates the target game object
 * with the deserialised component data.
 */
export class ImportBlueprint extends Import {
    public static Instance: ImportBlueprint | null = null;

    constructor() {
        super();
        ImportBlueprint.Instance = this;
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
                text: 'ImportBlueprint skipped: no game object target.',
                options: { tags: ['GameObject', 'Import'] }
            });
            return false;
        }
        const data = await this.ReadFileEditor(filename);
        if (!data) { return false; }
        Import.HydrateGameObject(go, data);
        LogManager.Instance?.Log({
            text: `Imported blueprint '${go.name}'.`,
            options: { tags: ['GameObject', 'Import'] }
        });
        return true;
    }

    public OnDestroy(): void {
        super.OnDestroy();
        if (ImportBlueprint.Instance === this) {
            ImportBlueprint.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared ImportBlueprint singleton instance.',
                options: { tags: ['GameObject', 'NitrateProcessDestroy'] }
            });
        }
    }
}
