import { SimulationConfig } from "../config/SimulationConfig";

interface SimulationSettings {
    gravity: number;
    simSpeed: number;
}

interface SimulationStepInfo {
    simulationSteps: number;
}

/**
 * Fixed-timestep accumulator for the simulation loop.
 *
 * Each frame, `Update` computes delta time, accumulates it scaled by tick rate and sim speed,
 * and returns the number of whole simulation steps to run. Caps accumulation to prevent
 * spiral-of-death on slow frames.
 */
export class SimulationClock {
    private lastUpdateTime: number | null;
    private simulationAccumulator: number;

    constructor() {
        this.lastUpdateTime = null;
        this.simulationAccumulator = 0;
    }

    public Update(time: number, settings: SimulationSettings): SimulationStepInfo {
        const deltaTime = this.DeltaTime(time);
        const simulationConfig = SimulationConfig.GetConfig();

        const gravityActive = Math.abs(settings.gravity) > 0.01;
        const gravityStrength = Math.max(1, Math.abs(settings.gravity));
        const maxAccumulatedSteps = simulationConfig.performance.maxAccumulatedSteps;

        const simStepsPerSecond = gravityActive
            ? simulationConfig.time.baseTickRate * gravityStrength * Math.max(0, settings.simSpeed)
            : 0;

        this.simulationAccumulator = Math.min(
            this.simulationAccumulator + deltaTime * simStepsPerSecond,
            maxAccumulatedSteps
        );

        const simulationSteps = Math.floor(this.simulationAccumulator);
        if (simulationSteps > 0) { this.simulationAccumulator = Math.max(0, this.simulationAccumulator - simulationSteps); }

        return { simulationSteps };
    }

    private DeltaTime(time: number): number {
        if (this.lastUpdateTime === null) {
            this.lastUpdateTime = time;
            return 0;
        }
        const dt = Math.max(0, time - this.lastUpdateTime);
        this.lastUpdateTime = time;
        return Math.min(dt, SimulationConfig.GetConfig().time.maxDeltaTime);
    }
}
