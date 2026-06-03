import type { Color } from '../../definitions/Primitives';
import type { MaterialId } from '../../materials/definitions/MaterialIdentity';

/** A particle is either a material or a raw color. */
export interface ParticleVisualModule {
    material?: MaterialId,
    color?: Color;
}
