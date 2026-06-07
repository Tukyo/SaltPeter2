import type { Color, RandomBetweenTwo } from '../../definitions/Primitives';
import type { MaterialId } from '../../materials/definitions/MaterialIdentity';
import type { ParticleModule } from '../ParticleModel';

/** A particle is either a material or a raw color. */
export interface ParticleVisualModule extends ParticleModule {
    material?: MaterialId,
    color?: Color | RandomBetweenTwo<Color>
}
