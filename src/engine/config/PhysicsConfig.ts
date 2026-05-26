/** Tunable constants for the simulation's physics model. */
export class PhysicsConfig {
    private static readonly config = {
        general: {
            interval: 8,
            gravity: 9.8
        },
        pressure: {
            densityScale: { // How much does density contribute to lateral spreading
                gas: 5.0,
                liquid: 2.5
            },
            resistance: { // (1.0 = immovable, 0.0 = freely moved by pressure)
                gas: 0.025, // How resistant gasses are to pressure-driven swaps
                liquid: 0.075, // How resistant liquids are to pressure-driven swaps
                powder: 0.01, // How resistant powders are to pressure-driven swaps
                solid: 0.925, // How resistant solids are to pressure-driven swaps
            },
            swapScale: { // Probability multiplier once pressure difference exceeds threshold
                gas: 15.0,
                liquid: 10.0,
                powder: 5.0,
                solid: 5.0,
            },
            swapThreshold: { // Minimum pressure difference between two cells to trigger a diffusion swap
                gas: 0.001,
                liquid: 0.055,
                powder: 0.135,
                solid: 0.135,
            },
            stepScale: 0.95 // Controls how gradual pressure scaling is
        },
        velocity: {
            acceleration: 0.02,
            damping: 0.98,
            propagation: 0.75,
            max: 1.0,
        }
    }

    /** Returns the physics configuration. */
    public static GetConfig() {
        return PhysicsConfig.config;
    }
}