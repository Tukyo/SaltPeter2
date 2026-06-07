import type { ParticleModule } from "../ParticleModel";

export interface ParticleCollisionModule extends ParticleModule {
    bounce: number; // Velocity reflection factor (0 = stick, 1 = perfect reflect)
    dampen: number; // Velocity scale applied after bounce
    lifetimeLoss: number; // Fraction of maxLifetime removed per collision
    minKillSpeed: number; // Kill particle if post-collision speed drops below this
}
