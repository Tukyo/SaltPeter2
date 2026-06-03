import type {
    FireBehavior,
    FireSimulation,
    LiquidBehavior,
    LiquidSimulation,
    PowderBehavior,
    PowderSimulation,
    SolidBehavior,
    SolidSimulation,
    GasBehavior,
    GasSimulation,
} from './definitions/MaterialPhases';

/**
 * Compiles high-level phase behavior parameters into GPU-ready simulation values.
 *
 * Each `Compute*` method takes the authored tunable params from a material definition
 * and derives the concrete probability and rate fields consumed by the WGSL shaders.
 * Called once per material at buffer build time — not at runtime.
 */
export class MaterialSimulation {
    /** Derives solid simulation values from {@link SolidBehavior} authored parameters. @internal */
    public static ComputeSolidSimulation(behavior: SolidBehavior): SolidSimulation {
        const activity = Math.max(behavior.activity, 0);
        const cohesion = Math.max(behavior.cohesion, 0);

        return {
            fallRandomRate: activity * 5.0,
            lateralSpreadChance: Math.min((1 - cohesion) * 0.25, 1),
            cohesionChance: Math.min(cohesion / 15, 1),
            cohesionNeighborBonus: Math.min(cohesion / 6, 1),
            maxCohesionChance: Math.min(cohesion * 1.0, 1),
        };
    }

    /** Derives powder simulation values from {@link PowderBehavior} authored parameters. @internal */
    public static ComputePowderSimulation(behavior: PowderBehavior): PowderSimulation {
        const activity = Math.max(behavior.activity, 0);
        const mobility = Math.max(behavior.mobility, 0);
        const flow = Math.max(behavior.flow, 0);
        const cohesion = Math.max(behavior.cohesion, 0);

        return {
            fallRandomRate: activity * 6.9,
            settleRandomRate: activity,
            diagonalFallChance: Math.min(flow * 12.5, 1),
            settleTryChance: Math.min(mobility * 0.7, 1),
            settleStayChance: Math.min(1 - mobility, 1),
            settleSurfaceRequireChance: Math.min(1 - (mobility * 0.3), 1),
            surfaceSlideChance: Math.min(flow * 1.0, 1),
            lateralSpreadChance: Math.min(flow * 1.0, 1),
            exposedSettleBonus: Math.min(mobility * 0.11, 1),
            cohesionChance: Math.min(cohesion / 15, 1),
            cohesionNeighborBonus: Math.min(cohesion / 6, 1),
            maxCohesionChance: Math.min(cohesion * 1.0, 1)
        };
    }

    /** Derives liquid simulation values from {@link LiquidBehavior} authored parameters. @internal */
    public static ComputeLiquidSimulation(behavior: LiquidBehavior): LiquidSimulation {
        const activity = Math.max(behavior.activity, 0);
        const flow = Math.max(behavior.flow, 0);
        const viscosity = Math.max(behavior.viscosity, 0);
        const turbulence = Math.max(behavior.turbulence, 0);

        return {
            fallRandomRate: activity * 8.0,
            flowRandomRate: activity * 5.0,
            downwardFlowChance: Math.min((flow * 1.25) * (1 - (viscosity * 0.35)), 1),
            lateralFlowChance: Math.min((flow * 2.0) * (1 - (viscosity * 0.6)), 1),
            diagonalFlowChance: Math.min((flow * 1.4) + (turbulence * 0.35), 1),
            viscosityResistanceChance: Math.min(viscosity * 0.95, 1),
            turbulenceChance: Math.min(turbulence * activity * 0.18, 1),
            turbulenceStrength: Math.min((turbulence * 0.75) + (flow * 0.15), 1),
            surfaceTension: Math.min((viscosity * 0.3) + ((1 - turbulence) * 0.4), 1),
            thickness: Math.min((1.0 - flow * 0.35) + (viscosity * 2.0), 0.99),
            dispersion: Math.min(flow * (1 - viscosity), 1)
        };
    }

    /** Derives gas simulation values from {@link GasBehavior} authored parameters. @internal */
    public static ComputeGasSimulation(behavior: GasBehavior): GasSimulation {
        const activity = Math.max(behavior.activity, 0);
        const rise = Math.max(behavior.rise, 0);
        const dissipation = Math.max(behavior.dissipation, 0);
        const turbulence = Math.max(behavior.turbulence, 0);

        return {
            riseRandomRate: activity * 4.0,
            upwardRiseChance: Math.min(rise, 0.25),
            diagonalRiseChance: Math.min(rise * 0.25 + turbulence * 0.2, 1),
            spreadRandomRate: activity * 4.5,
            lateralSpreadChance: Math.min(dissipation * 1.15 + turbulence * 0.15, 1),
            turbulenceChance: Math.min(turbulence * activity * 0.2, 1),
            dissipationChance: Math.min(dissipation * 0.01, 1),
        };
    }

    /** Derives fire simulation values from {@link FireBehavior} authored parameters. @internal */
    public static ComputeFireSimulation(behavior: FireBehavior): FireSimulation {
        const activity = Math.max(behavior.activity, 0);
        const mobility = Math.max(behavior.mobility, 0);
        const dissipation = Math.max(behavior.dissipation, 0);

        return {
            fallRandomRate: activity * 12.0,
            settleRandomRate: activity,
            diagonalFallChance: Math.min(mobility * 0.5, 1),
            settleStayChance: Math.min(1 - mobility, 1),
            surfaceSlideChance: Math.min(mobility * 0.3, 1),
            lateralSpreadChance: Math.min(mobility * 0.3, 1),
            dissipationChance: Math.min(dissipation * 0.01, 1),
        };
    }
}
