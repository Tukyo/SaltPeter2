import { LogManager } from "../debug/LogManager";

// TODO: Right now, this system is fully built on save slot relative path, either commit to that or generalize.

/** Central router for all disk persistence. Manages save slots and provides read/write access to the active slot. */
export class DataPersistenceManager {
    public static Instance: DataPersistenceManager | null = null;

    private readonly ready: Promise<void>;

    private root: string;

    constructor() {
        this.root = 'Save_00';
        DataPersistenceManager.Instance = this;
        this.ready = this.DetectSlot();
    }

    private static SlotName(index: number): string {
        return `Save_${String(index).padStart(2, '0')}`;
    }

    /** Scans existing save slots on disk and sets the active root to the most recent one, or slot 0 if none exist. */
    private async DetectSlot(): Promise<void> {
        let last = -1;
        let index = 0;
        while (await window.api.saves.exists(DataPersistenceManager.SlotName(index))) {
            last = index;
            index++;
        }
        this.root = DataPersistenceManager.SlotName(last === -1 ? 0 : last);
        LogManager.Instance?.Log({
            text: `Loaded save slot: ${this.root}`,
            options: { tags: ['DataPersistence'] },
        });
    }

    /** Finds the next unused slot and switches to it. Call explicitly for New Game. */
    public async CreateNewSlot(): Promise<void> {
        await this.ready;
        let index = 0;
        while (await window.api.saves.exists(DataPersistenceManager.SlotName(index))) {
            index++;
        }
        this.root = DataPersistenceManager.SlotName(index);
        LogManager.Instance?.Log({
            text: `Created new save slot: ${this.root}`,
            options: { tags: ['DataPersistence'] },
        });
    }

    /** Writes a binary file to the active save slot at the given relative path. */
    public async WriteFile(relativePath: string, data: ArrayBuffer, compress = true): Promise<void> {
        await this.ready;
        await window.api.saves.write(`${this.root}/${relativePath}`, data, compress);
    }

    /** Reads a binary file from the active save slot at the given relative path. Returns null if not found. */
    public async ReadFile(relativePath: string, compress = true): Promise<ArrayBuffer | null> {
        await this.ready;
        return window.api.saves.read(`${this.root}/${relativePath}`, compress);
    }

    /** Returns true if a file exists at the given relative path within the active save slot. */
    public async FileExists(relativePath: string): Promise<boolean> {
        await this.ready;
        return window.api.saves.exists(`${this.root}/${relativePath}`);
    }

    /** Deletes a file at the given relative path within the active save slot. */
    public async DeleteFile(relativePath: string): Promise<void> {
        await this.ready;
        await window.api.saves.delete(`${this.root}/${relativePath}`);
    }

    /** Deletes the entire active save slot directory from disk. */
    public async DeleteSave(): Promise<void> {
        await this.ready;
        await window.api.saves.deleteDir(this.root);
        LogManager.Instance?.Log({
            text: `Deleted save: ${this.root}`,
            options: { tags: ['DataPersistence'] },
        });
    }
}
