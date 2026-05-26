/** Timing and performance parameters for the simulation loop. */
export class SimulationConfig {
    private static readonly config = {
        performance: {
            maxAccumulatedSteps: 120,
            workgroupSize: 8
        },
        time: {
            baseTickRate: 60,
            maxDeltaTime: 0.05
        }
    };

    /** Returns the simulation configuration. */
    public static GetConfig() {
        return SimulationConfig.config;
    }
}