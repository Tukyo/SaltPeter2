export interface ParticleEmissionModule {
    bursts?: {
        count: number; // How many particles per burst
        time: number; // When in the cycle the burst fires
        cycles: number; // How many times to repeat the burst
        interval: number; // Time between burst cycles
        probability: number; // Chance of the burst occuring
    }[]
    rate?: {
        time?: number; // Particles spawned per second
        distance?: number; // Particles spawned per cell moved
    }
}
