import type {
    SolidSimulation,
    PowderSimulation,
    LiquidSimulation,
    GasSimulation,
    FireSimulation
} from './definitions/MaterialPhases';

/**
 * Single source of truth for per-phase simulation field layouts and movement intent constants.
 *
 * Consumed by {@link MaterialSimulationBuffer} (data packing) and {@link ShaderFactory}
 * (WGSL struct generation) so both sides stay in sync. Owns the schema, not the data.
 */
export class MaterialSimulationSchema {
    //#region GENERAL
    /** Returns the maximum number of floats any phase needs, used to size the buffer stride. @internal */
    public static GetMaxFloatsPerMaterial(): number {
        return Math.max(
            MaterialSimulationSchema.solidSimulationFields.length,
            MaterialSimulationSchema.powderSimulationFields.length,
            MaterialSimulationSchema.liquidSimulationFields.length,
            MaterialSimulationSchema.gasSimulationFields.length,
            MaterialSimulationSchema.fireSimulationFields.length,
        );
    }

    private static readonly materialIntent = {
        STAY: 0.0,
        FALL: 1.0,
        DIAGONAL_LEFT: 2.0,
        DIAGONAL_RIGHT: 3.0,
        LATERAL_LEFT: 4.0,
        LATERAL_RIGHT: 5.0,
        RISE: 6.0,
        DIAGONAL_RISE_LEFT: 7.0,
        DIAGONAL_RISE_RIGHT: 8.0,
    } as const;

    /** Returns the movement intent constants used by the WGSL movement resolution shader. @internal */
    public static GetMaterialIntent() { return MaterialSimulationSchema.materialIntent; }
    //#endregion

    //#region SOLID
    private static readonly solidSimulationFields = [
        'fallRandomRate',
        'lateralSpreadChance',
        'cohesionChance',
        'cohesionNeighborBonus',
        'maxCohesionChance',
    ] as const satisfies readonly (keyof SolidSimulation)[];

    /** Returns the ordered field names for the solid simulation GPU struct. @internal */
    public static GetSolidSimulationFields() { return MaterialSimulationSchema.solidSimulationFields; }
    //#endregion

    //#region POWDER
    private static readonly powderSimulationFields = [
        'fallRandomRate',
        'settleRandomRate',
        'diagonalFallChance',
        'settleTryChance',
        'settleStayChance',
        'settleSurfaceRequireChance',
        'surfaceSlideChance',
        'lateralSpreadChance',
        'exposedSettleBonus',
        'cohesionChance',
        'cohesionNeighborBonus',
        'maxCohesionChance'
    ] as const satisfies readonly (keyof PowderSimulation)[];

    /** Returns the ordered field names for the powder simulation GPU struct. @internal */
    public static GetPowderSimulationFields() { return MaterialSimulationSchema.powderSimulationFields; }
    //#endregion

    //#region LIQUID
    private static readonly liquidSimulationFields = [
        'fallRandomRate',
        'flowRandomRate',
        'downwardFlowChance',
        'lateralFlowChance',
        'diagonalFlowChance',
        'viscosityResistanceChance',
        'turbulenceChance',
        'turbulenceStrength',
        'surfaceTension',
        'thickness',
        'dispersion'
    ] as const satisfies readonly (keyof LiquidSimulation)[];

    /** Returns the ordered field names for the liquid simulation GPU struct. @internal */
    public static GetLiquidSimulationFields() { return MaterialSimulationSchema.liquidSimulationFields; }
    //#endregion

    //#region GAS
    private static readonly gasSimulationFields = [
        'riseRandomRate',
        'upwardRiseChance',
        'diagonalRiseChance',
        'spreadRandomRate',
        'lateralSpreadChance',
        'turbulenceChance',
        'dissipationChance',
    ] as const satisfies readonly (keyof GasSimulation)[];

    /** Returns the ordered field names for the gas simulation GPU struct. @internal */
    public static GetGasSimulationFields() { return MaterialSimulationSchema.gasSimulationFields; }
    //#endregion

    //#region FIRE
    private static readonly fireSimulationFields = [
        'fallRandomRate',
        'settleRandomRate',
        'diagonalFallChance',
        'settleStayChance',
        'surfaceSlideChance',
        'lateralSpreadChance',
        'dissipationChance',
    ] as const satisfies readonly (keyof FireSimulation)[];

    /** Returns the ordered field names for the fire simulation GPU struct. @internal */
    public static GetFireSimulationFields() { return MaterialSimulationSchema.fireSimulationFields; }
    //#endregion
}
