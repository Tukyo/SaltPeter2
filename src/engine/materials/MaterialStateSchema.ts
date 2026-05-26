/**
 * Declares the ordered field layout for the per-material state GPU buffer.
 *
 * The field list drives both {@link MaterialStateBuffer} (which packs the data) and
 * {@link ShaderFactory} (which emits the matching WGSL struct), so both sides stay in sync
 * from a single source of truth.
 */
export class MaterialStateSchema {
    private static readonly materialStateFields = [
        ['health', 'f32'],
        ['lifetime', 'f32'],
    ] as const satisfies ReadonlyArray<readonly [string, string]>;

    /** Returns the ordered `[name, type]` field pairs that define the state buffer layout. @internal */
    public static GetMaterialStateFields() { return MaterialStateSchema.materialStateFields; }
}
