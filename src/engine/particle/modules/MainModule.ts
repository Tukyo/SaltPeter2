import type { NumberRange } from "../../definitions/Primitives";

export interface ParticleMainModule {
    duration: number; // How long the system runs
    gravityMultiplier?: number; // Gravity multiplier applied to the particle
    loop: boolean; // Restarts after duration
    start: {
        delay?: number; // Delay before first emission
        lifetime: number | NumberRange; // How long each particle lives
        speed: number | NumberRange; // Initial speed
    }
}
