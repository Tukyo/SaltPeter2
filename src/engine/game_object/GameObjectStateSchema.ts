/**
 * Declares the per-game-object GPU state buffer layout.
 *
 * Each slot holds live physics state for one active game object.
 * Consumed by {@link GameObjectBuffers} (buffer sizing) and {@link ShaderFactory}
 * (WGSL struct generation) so both sides stay in sync from a single source.
 */
export class GameObjectStateSchema {
    public static readonly fields = [
        ['posX', 'f32'],
        ['posY', 'f32'],
        ['prevPosX', 'f32'],
        ['prevPosY', 'f32'],
        ['velX', 'f32'],
        ['velY', 'f32'],
        ['gravityScale', 'f32'],
        ['drag', 'f32'],
        ['pivotX', 'f32'],
        ['pivotY', 'f32'],
        ['id', 'u32'],
        ['cellOffset', 'u32'],
        ['cellCount', 'u32'],
        ['bodyType', 'u32'],
        ['isActive', 'u32'],
        ['colliderDirty', 'u32'],
        ['boundaryOffset', 'u32'],
        ['boundaryCount', 'u32'],
        ['bounciness', 'f32'],
        ['friction', 'f32'],
        ['mass', 'f32'],
        ['isSleeping', 'u32'],
        ['hitCount', 'u32'],
        ['theta', 'f32'],
        ['omega', 'f32'],
        ['prevTheta', 'f32'],
        ['angularDrag', 'f32'],
        ['sleepTimer', 'u32'],
        ['momentOfInertia', 'f32'],
    ] as const satisfies ReadonlyArray<readonly [string, string]>;

    /** Number of 32-bit words per GameObjectState entry. */
    public static readonly stride = GameObjectStateSchema.fields.length;

    /** Byte size of one GameObjectState entry. */
    public static readonly byteStride = GameObjectStateSchema.stride * 4;

    /** Returns the GameObjectStateSchema fields. @internal */
    public static GetFields() { return GameObjectStateSchema.fields; }
}
