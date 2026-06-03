export interface ParticleVelocityOverLifetimeModule {
    linear?: {
        x?: {
            start: number;
            end: number;
        }
        y?: {
            start: number;
            end: number;
        }
    }
    speedMultiplier?: number;
}
