/** Timing and performance parameters for the simulation loop. */
export class SimulationConfig {
    private static readonly config = {
        performance: {
            maxAccumulatedSteps: 120,
            workgroupSize: 8
        },
        time: {
            baseTickRate: 60,
            stepsPerTick: 10,
            maxDeltaTime: 0.05
        },
        noise: {
            type: 0,
            octaves: 2,
            persistence: 0.5,
            scale: 15.0,
            scrollSpeed: 0.03,
            threshold: 0.3,
            strength: 0.25
        }
    };

    /** Returns the simulation configuration. */
    public static GetConfig() { return SimulationConfig.config; }
}