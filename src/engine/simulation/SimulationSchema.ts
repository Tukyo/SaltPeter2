/**
 * Declares the ordered uniform field layouts for each simulation pass.
 *
 * Consumed by pass constructors (buffer sizing) and {@link ShaderFactory} (WGSL struct
 * generation) so both sides stay in sync from a single source of truth.
 */
export class SimulationSchema {
    private static readonly sharedUniformFields = [
        ['time', 'f32'],
        ['gravity', 'f32'],
        ['deltaTime', 'f32'],
    ] as const satisfies ReadonlyArray<readonly [string, string]>;

    private static readonly diffusionUniformFields = [
        ['parity', 'u32'],
        ['gasSwapThreshold', 'f32'],
        ['liquidSwapThreshold', 'f32'],
        ['powderSwapThreshold', 'f32'],
        ['solidSwapThreshold', 'f32'],
        ['gasSwapScale', 'f32'],
        ['liquidSwapScale', 'f32'],
        ['powderSwapScale', 'f32'],
        ['solidSwapScale', 'f32'],
        ['gasResistance', 'f32'],
        ['liquidResistance', 'f32'],
        ['powderResistance', 'f32'],
        ['solidResistance', 'f32'],
        ['liquidDensityScale', 'f32'],
        ['gasDensityScale', 'f32'],
    ] as const satisfies ReadonlyArray<readonly [string, string]>;

    // @omitfromdocs
    public static GetIntentUniformFields() { return SimulationSchema.sharedUniformFields; }

    // @omitfromdocs
    public static GetSimUniformFields() { return SimulationSchema.sharedUniformFields; }

    // @omitfromdocs
    public static GetDiffusionUniformFields() { return SimulationSchema.diffusionUniformFields; }
}
