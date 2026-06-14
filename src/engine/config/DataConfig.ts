/** Paths and locations for all persistent data written to or read from disk. */
export class DataConfig {
    private static readonly config = {
        world: {
            worldPath: 'World',
            chunkPath: (cx: number, cy: number) => `Chunks/chunk_${cx}_${cy}.bin`,
        },
    };

    /** Returns the data configuration. */
    public static GetConfig() { return DataConfig.config; }
}
