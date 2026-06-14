import type { MaterialName } from '../materials/definitions/MaterialIdentity';
import type { ParticleName } from './ParticleIdentity'

export interface ParticleSource {
    materials: MaterialName[];
    particles: ParticleName[];
}

export const Sources: ParticleSource[] = [
    { materials: ['fire'], particles: ['fire', 'smoke'] },
    { materials: ['lava'], particles: ['lava'] },
    { materials: ['acid'], particles: ['acid'] },
];
