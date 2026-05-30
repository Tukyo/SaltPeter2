import { Import } from './Import';

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
    public async Run(filename?: string): Promise<void> {
        const go = this.gameObjectProvider?.() ?? null;
        const data = await this.ReadFileEditor(filename);
        if (!go || !data) { return; }
        Import.HydrateGameObject(go, data);
    }

    public OnDestroy(): void {
        super.OnDestroy();
        if (ImportBlueprint.Instance === this) { ImportBlueprint.Instance = null; }
    }
}
