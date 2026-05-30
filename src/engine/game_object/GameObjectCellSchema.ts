/**
 * Declares the per-cell GPU buffer layout for game object cells.
 *
 * All cells for all active game objects are packed into a single flat buffer.
 * Each entry holds the cell's object-local position, back-references to its
 * owning game object slot, and the permanent material identity fields.
 * Dynamic per-cell state (temperature, health, lifetime) is NOT stored here —
 * the stamp pass carries those forward by reading the current simulation textures
 * at the cell's previous world position each step.
 *
 * Consumed by {@link GameObjectBuffers} (buffer sizing) and {@link ShaderFactory}
 * (WGSL struct generation) so both sides stay in sync from a single source.
 */
export class GameObjectCellSchema {
    public static readonly fields = [
        ['localX', 'i32'],
        ['localY', 'i32'],
        ['gameObjectIdx', 'u32'],
        ['gameObjectId', 'u32'],
        ['materialId', 'u32'],
        ['colorSeed', 'f32'],
    ] as const satisfies ReadonlyArray<readonly [string, string]>;

    /** Number of 32-bit words per GameObjectCell entry. */
    public static readonly stride = GameObjectCellSchema.fields.length;

    /** Byte size of one GameObjectCell entry. */
    public static readonly byteStride = GameObjectCellSchema.stride * 4;

    /** Returns the GameObjectCellSchema fields. @internal */
    public static GetFields() { return GameObjectCellSchema.fields; }
}
