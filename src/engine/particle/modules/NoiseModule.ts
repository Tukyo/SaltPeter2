import type { NoiseType } from '../../utility/Noise';
import type { ParticleModule } from '../ParticleModel';
import type { RandomBetweenTwo, Vec2 } from '../../definitions/Primitives';

export interface ParticleNoiseModule extends ParticleModule {
    type: NoiseType;
    octaves: number;
    persistence: number;
    scale: number;
    amplitude: number | RandomBetweenTwo<number>
    scrollSpeed: Vec2 | RandomBetweenTwo<Vec2>
}
