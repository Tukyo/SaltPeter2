/** Tunable constants for the particle system. */
export class ParticleConfig {
    private static readonly config = {
        performance: {
            maxParticles: 65536,
            maxParticlesPerMaterial: 4,
            maxGameObjectEmitters: 256,
        }
    };

    /** Returns the particle configuration. */
    public static GetConfig() { return ParticleConfig.config; }
}
