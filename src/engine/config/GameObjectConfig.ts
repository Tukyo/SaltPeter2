/** Parameters and defaults for GameObjects. */
export class GameObjectConfig {
    private static readonly config = {
        performance: {
            maxGameObjectCount: 256, // Max amount of GameObjects allowed in the state buffer
            maxGameObjectCellsCount: 65536, // Max amount of GameObject cells (pixels) allowed in the state buffer
            maxSpeed: 5 // How many cells per sim step a GameObject is allowed to move
        },
        physics: {
            angular: {
                // Maximum angular velocity in rad/s. Set to 0 to disable rotation.
                maxAngularSpeed: 5,
                // Minimum distance (in cells) from pivot to contact centroid before rolling friction applies.
                // Below this the lever arm is too short for stable torque computation.
                minLeverArm: 0.1
            },
            bleed: {
                // Minimum fractional pixel displacement required to bleed a cell into neighboring pixels.
                // 0 = always bleed on any non-integer position, filling all rotation gaps.
                threshold: 0
            },
            collision: {
                depenetration: {
                    // Max cell push per sim step when overlapping. Scales with fraction of boundary points inside.
                    force: 1.0,
                    // Power curve exponent on penetration fraction. 1 = linear. Higher values push harder at shallow
                    // overlaps, resisting objects phasing into each other before penetration depth becomes significant.
                    hardness: 1.0,
                    // Fraction of boundary points that must be inside a collider before the push fires.
                    // Below this threshold, shallow overlaps are ignored entirely.
                    allowance: 0.2
                },
                detection: {
                    // Minimum collision normal strength required to trigger a response. Filters degenerate contacts.
                    threshold: 1
                },
                settle: {
                    // Minimum relative lateral speed in cells/s to apply sliding friction. Below this, velocity locks to surface.
                    threshold: 0.0
                }
            },
            liquid: {
                // Scale change for buoyancy of GameObjects in liquids
                buoyancy: 1.0,
                // Per-step velocity damping fraction when submerged (0=none, 1=instant stop)
                drag: 0.01,
                // Multiplier on liquid cell velocity before applying drag coupling to GOs
                velocityScale: 100.0
            },
            sleep: {
                linear: {
                    // Linear speed in cells/s below which a grounded object starts its sleep countdown.
                    threshold: 0,
                    // Consecutive sim steps below threshold before sleeping.
                    delay: 60
                },
                angular: {
                    // Angular speed in rad/s below which rotation is considered at rest for sleep.
                    threshold: 0
                },
                wake: {
                    // Fraction of boundary points that must change contact state to wake a sleeping object.
                    // Normalized to boundaryCount so sensitivity is consistent across object sizes.
                    contactFraction: 0.01,
                    // Minimum speed in cells/s of a contacting GameObjects required to wake a sleeping object. 0 = disabled.
                    velocityThreshold: 0
                }
            }
        }
    };

    /** Returns the GameObject configuration. */
    public static GetConfig() { return GameObjectConfig.config; }
}
