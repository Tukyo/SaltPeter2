import type { ParticleModule } from "../ParticleModel";
import type { RandomBetweenTwo } from "../../definitions/Primitives";

export interface ParticleVelocityOverLifetimeModule extends ParticleModule {
    linear?: {
        x?: { start: number; end: number; } | RandomBetweenTwo<{ start: number; end: number }>
        y?: { start: number; end: number; } | RandomBetweenTwo<{ start: number; end: number }>
    }
    speedMultiplier?: number;
}
