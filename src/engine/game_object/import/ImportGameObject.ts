import { Import } from './Import';

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
    public async Run(filename?: string): Promise<void> {
        const go = this.gameObjectProvider?.() ?? null;
        const data = await this.ReadFile(filename);
        if (!go || !data) { return; }
        this.HydrateGameObject(go, data);
    }

    public OnDestroy(): void {
        super.OnDestroy();
        if (ImportGameObject.Instance === this) { ImportGameObject.Instance = null; }
    }
}
