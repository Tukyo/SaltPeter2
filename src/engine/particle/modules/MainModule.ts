export interface ParticleMainModule {
    duration: number; // How long the system runs
    gravityMultiplier?: number; // Gravity multiplier applied to the particle
    loop: boolean; // Restarts after duration
    start: {
        delay?: number; // Delay before first emission
        lifetime: { // How long each particle lives
            min: number;
            max: number;
        }
        speed: { // Initial speed
            min: number;
            max: number;
        }
    }
}
