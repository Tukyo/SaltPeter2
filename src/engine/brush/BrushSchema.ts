/**
 * Defines the uniform layout and noise pattern parameters used by the brush compute shader.
 * @internal
 */
export class BrushSchema {
    private static readonly brushUniformFields = [
        ['mouseX', 'f32'],
        ['mouseY', 'f32'],
        ['radius', 'f32'],
        ['density', 'f32'],
        ['materialId', 'f32'],
        ['time', 'f32'],
        ['shape', 'f32'],
        ['colorVariant', 'f32'],
        ['brushType', 'f32'],
        ['variantId', 'f32'],
        ['occupancy', 'f32'],
        ['paintMode', 'f32'],
        ['marginSize', 'f32'],
        ['colorWeight0', 'f32'],
        ['colorWeight1', 'f32'],
        ['colorWeight2', 'f32'],
        ['colorWeight3', 'f32'],
        ['stripeAngle', 'f32'],
        ['stripeWidth', 'f32'],
        ['overlayFilter', 'f32'],
        ['isErase', 'f32'],
    ] as const satisfies ReadonlyArray<readonly [string, string]>;

    /** Returns the list of uniform field name/type pairs used to build the brush compute shader. */
    public static GetBrushUniformFields() { return BrushSchema.brushUniformFields; }

    private static readonly brushPattern = {
        randomRate: 8.0,
        blobScale: 8.0,
        detailScale: 3.0,
        blobStrength: 6.0,
        detailStrength: 3.0,
        grainStrength: 1.0,
    } as const;

    /** Returns the noise pattern parameters that control brush stroke shape and texture. */
    public static GetBrushPattern() { return BrushSchema.brushPattern; }
}
