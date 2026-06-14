import { WorldConfig } from '../../config/WorldConfig';

export interface ChunkAddress { cx: number; cy: number; }

/**
 * CPU-side representation of a single chunk's GPU texture data.
 * - `identity`: rgba8unorm — [materialId, colorSeed, variantId, occupancy]
 * - `physics`: rgba32float — [temperature, pressure, velocityX, velocityY]
 * - `state`: rgba32float — [health, lifetime, unused, unused]
 */
export interface ChunkEntry {
    address: ChunkAddress;
    identity: ArrayBuffer;
    physics: ArrayBuffer;
    state: ArrayBuffer;
}

// @omitfromdocs
export interface ChunkViews {
    identity: DataView;
    physics: DataView;
    state: DataView;
}

/** Static accessors and writers for chunk buffer layout — sizes, byte strides, and per-cell DataView writes. */
export class ChunkData {
    /** Returns the configured chunk size in cells. */
    public static GetChunkSize(): number { return WorldConfig.GetConfig().chunk.size; }

    /** Returns the canonical string key for a chunk address, used as the Map key in ChunkManager. */
    public static GetKey(address: ChunkAddress): string { return `${address.cx},${address.cy}`; }

    //#region IDENTITY
    /** Returns the byte size of a single identity cell (rgba8unorm = 4 bytes). @internal */
    public static GetIdentityBytesPerCell(): number { return WorldConfig.GetConfig().cell.identityBytes; }

    /** Returns the total byte size of one chunk's identity buffer. @internal */
    public static GetIdentityBytesPerChunk(): number {
        const s = ChunkData.GetChunkSize();
        return s * s * ChunkData.GetIdentityBytesPerCell();
    }

    /** Writes material id, color seed, variant, and occupancy into the identity buffer at the given cell index. @internal */
    public static WriteIdentity(
        view: DataView, cellIndex: number,
        values: { materialId: number; colorSeed: number; variantId: number; occupancy: number }
    ): void {
        const base = cellIndex * ChunkData.GetIdentityBytesPerCell();
        view.setUint8(base, values.materialId);
        view.setUint8(base + 1, values.colorSeed);
        view.setUint8(base + 2, values.variantId);
        view.setUint8(base + 3, values.occupancy);
    }
    //#endregion

    //#region PHYSICS
    /** Returns the byte size of a single physics cell (rgba32float = 16 bytes). @internal */
    public static GetPhysicsBytesPerCell(): number { return WorldConfig.GetConfig().cell.physicsBytes; }

    /** Returns the total byte size of one chunk's physics buffer. @internal */
    public static GetPhysicsBytesPerChunk(): number {
        const s = ChunkData.GetChunkSize();
        return s * s * ChunkData.GetPhysicsBytesPerCell();
    }

    /** Writes temperature, pressure, and velocity into the physics buffer at the given cell index. @internal */
    public static WritePhysics(
        view: DataView, cellIndex: number,
        values: { temperature: number; pressure: number; velocityX: number; velocityY: number }
    ): void {
        const base = cellIndex * ChunkData.GetPhysicsBytesPerCell();
        view.setFloat32(base, values.temperature, true);
        view.setFloat32(base + 4, values.pressure, true);
        view.setFloat32(base + 8, values.velocityX, true);
        view.setFloat32(base + 12, values.velocityY, true);
    }
    //#endregion

    //#region STATE
    /** Returns the byte size of a single state cell (rgba32float = 16 bytes). @internal */
    public static GetStateBytesPerCell(): number { return WorldConfig.GetConfig().cell.stateBytes; }

    /** Returns the total byte size of one chunk's state buffer. @internal */
    public static GetStateBytesPerChunk(): number {
        const s = ChunkData.GetChunkSize();
        return s * s * ChunkData.GetStateBytesPerCell();
    }

    /** Writes health, lifetime, and unused channels into the state buffer at the given cell index. @internal */
    public static WriteState(
        view: DataView, cellIndex: number,
        values: { health: number; lifetime: number; unused0: number; unused1: number }
    ): void {
        const base = cellIndex * ChunkData.GetStateBytesPerCell();
        view.setFloat32(base, values.health, true);
        view.setFloat32(base + 4, values.lifetime, true);
        view.setFloat32(base + 8, values.unused0, true);
        view.setFloat32(base + 12, values.unused1, true);
    }
    //#endregion
}
