import type { ParticleId, ParticleName } from './ParticleIdentity'

import type { ParticleCollisionModule } from './modules/CollisionModule';
import type { ParticleColorOverLifetimeModule } from './modules/ColorOverLifetimeModule';
import type { ParticleEmissionModule } from './modules/EmissionModule';
import type { ParticleInheritVelocityModule } from './modules/InheritVelocityModule';
import type { ParticleMainModule } from './modules/MainModule';
import type { ParticleNoiseModule } from './modules/NoiseModule';
import type { ParticleShapeModule } from './modules/ShapeModule';
import type { ParticleSubEmitterModule } from './modules/SubEmitterModule';
import type { ParticleVelocityOverLifetimeModule } from './modules/VelocityOverLifetimeModule';
import type { ParticleVisualModule } from './modules/VisualModule';

// Particles are single pixels that are rendered at the end of the forward rendering pipeline.
// They do not contribute to the simulation or have physical properties.

export interface ParticleDefinition {
    id: ParticleId;
    name: ParticleName;

    modules: {
        main: ParticleMainModule;
        visual?: ParticleVisualModule;
        emission?: ParticleEmissionModule;
        shape?: ParticleShapeModule;
        subEmitter?: ParticleSubEmitterModule;
        velocityOverLifetime?: ParticleVelocityOverLifetimeModule;
        inheritVelocity?: ParticleInheritVelocityModule
        colorOverLifetime?: ParticleColorOverLifetimeModule;
        noise?: ParticleNoiseModule;
        collision?: ParticleCollisionModule;
    }
}

/** Base module class for all ParticleModules. */
export interface ParticleModule { enabled?: boolean; }
