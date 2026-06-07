import type { ParticleModule } from "../ParticleModel";

type InheritVelocityMode = 'Current' | 'Initial';

export interface ParticleInheritVelocityModule extends ParticleModule {
    mode: InheritVelocityMode;
    multiplier: number;
}
