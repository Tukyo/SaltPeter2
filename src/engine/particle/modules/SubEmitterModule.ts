import type { ParticleId } from '../ParticleIdentity'
import type { ParticleDefinition, ParticleModule } from '../ParticleModel';

export interface ParticleSubEmitterModule extends ParticleModule {
    spawnCondition: ParticleSubEmitterSpawnCondition;
    particle: ParticleId; // The particle to spawn when this triggers
    inherit?: Array<keyof ParticleDefinition['modules']>; // What modules from the parent to inherit
    probability: number; // (0 - 1) - 1 means it always happens, 0 means it never will
}

export type ParticleSubEmitterSpawnCondition =
    | "Birth" // Spawns the sub particle on birth of the base particle
    | "Collision" // Spawns the sub particle on collision with the sim
    | "Death" // Spawns the sub particle on death of the base particle
