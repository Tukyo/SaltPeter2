import { ParticleIds } from './Particles'

export type ParticleName = keyof typeof ParticleIds;
export type ParticleId = (typeof ParticleIds)[ParticleName];