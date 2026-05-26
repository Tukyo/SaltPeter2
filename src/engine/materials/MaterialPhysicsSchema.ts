/**
 * Declares the ordered field layout for the per-material physics GPU buffer.
 *
 * The field list drives both {@link MaterialPhysicsBuffer} (which packs the data) and
 * {@link ShaderFactory} (which emits the matching WGSL struct), so both sides stay in sync
 * from a single source of truth.
 */
export class MaterialPhysicsSchema {
    private static readonly materialPhysicsFields = [
        ['phaseId', 'f32'],
        ['density', 'f32'],
        ['durability', 'f32'],
        ['specificHeat', 'f32'],
        ['restingTemperature', 'f32'],
        ['meltTemp', 'f32'],
        ['meltToId', 'f32'],
        ['boilTemp', 'f32'],
        ['boilToId', 'f32'],
        ['freezeTemp', 'f32'],
        ['freezeToId', 'f32'],
        ['condenseTemp', 'f32'],
        ['condenseToId', 'f32'],
        ['restingStrength', 'f32'],
    ] as const satisfies ReadonlyArray<readonly [string, string]>;

    /** Returns the ordered `[name, type]` field pairs that define the physics buffer layout. @internal */
    public static GetMaterialPhysicsFields() { return MaterialPhysicsSchema.materialPhysicsFields; }
}
