// @omitfromdocs
export const MaterialPhaseIds = {
    solid: 0,
    powder: 1,
    liquid: 2,
    gas: 3,
    fire: 4,
} as const;

export type MaterialPhase = keyof typeof MaterialPhaseIds;
export type MaterialPhaseId = (typeof MaterialPhaseIds)[MaterialPhase];

export interface MaterialPhaseBehavior {
    solid?: SolidBehavior;
    powder?: PowderBehavior;
    liquid?: LiquidBehavior;
    gas?: GasBehavior;
    fire?: FireBehavior;
}

export interface SolidBehavior {
    activity: number;
    cohesion: number;
}

// @omitfromdocs
export interface SolidSimulation {
    fallRandomRate: number;
    lateralSpreadChance: number
    cohesionChance: number;
    cohesionNeighborBonus: number;
    maxCohesionChance: number;
}

export interface PowderBehavior {
    activity: number;
    mobility: number;
    flow: number;
    cohesion: number;
}

// @omitfromdocs
export interface PowderSimulation {
    fallRandomRate: number;
    settleRandomRate: number;
    diagonalFallChance: number;
    settleTryChance: number;
    settleStayChance: number;
    settleSurfaceRequireChance: number;
    surfaceSlideChance: number;
    lateralSpreadChance: number;
    exposedSettleBonus: number;
    cohesionChance: number;
    cohesionNeighborBonus: number;
    maxCohesionChance: number;
}

export interface LiquidBehavior {
    activity: number;
    flow: number;
    viscosity: number;
    turbulence: number;
}

// @omitfromdocs
export interface LiquidSimulation {
    fallRandomRate: number;
    flowRandomRate: number;
    downwardFlowChance: number;
    lateralFlowChance: number;
    diagonalFlowChance: number;
    viscosityResistanceChance: number;
    turbulenceChance: number;
    turbulenceStrength: number;
    surfaceTension: number;
    thickness: number;
    dispersion: number;
}

export interface GasBehavior {
    activity: number;
    rise: number;
    dissipation: number;
    turbulence: number;
}

// @omitfromdocs
export interface GasSimulation {
    riseRandomRate: number;
    upwardRiseChance: number;
    diagonalRiseChance: number;
    spreadRandomRate: number;
    lateralSpreadChance: number;
    turbulenceChance: number;
    dissipationChance: number;
}

export interface FireBehavior {
    activity: number;
    mobility: number;
    dissipation: number;
}

// @omitfromdocs
export interface FireSimulation {
    fallRandomRate: number;
    settleRandomRate: number;
    diagonalFallChance: number;
    settleStayChance: number;
    surfaceSlideChance: number;
    lateralSpreadChance: number;
    dissipationChance: number;
}
