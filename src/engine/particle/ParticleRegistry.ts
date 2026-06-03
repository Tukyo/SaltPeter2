import type { ParticleDefinition } from './ParticleModel';
import type { ParticleName } from './ParticleIdentity';

const modules = import.meta.glob('./definitions/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

/**
 * Auto-discovers and indexes every particle definition in the `definitions/` directory.
 *
 * Uses `import.meta.glob` to eagerly load all `.ts` files under `definitions/`, then
 * walks every export looking for objects with `name` and `id` properties. No manual
 * registration is needed — adding a definition file is enough.
 */
export class ParticleRegistry {
    public static readonly Particles: Record<ParticleName, ParticleDefinition> = ParticleRegistry.build();

    private static build(): Record<ParticleName, ParticleDefinition> {
        const particles = {} as Record<ParticleName, ParticleDefinition>;

        for (const module of Object.values(modules)) {
            for (const exported of Object.values(module)) {
                if (exported && typeof exported === 'object' && 'name' in exported && 'id' in exported) {
                    const particle = exported as ParticleDefinition;
                    particles[particle.name] = particle;
                }
            }
        }

        return particles;
    }
}
