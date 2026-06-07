import type { Color, RandomBetweenTwo } from "../../definitions/Primitives";
import type { ParticleModule } from "../ParticleModel";

export interface ParticleColorOverLifetimeModule extends ParticleModule {
    start: Color | RandomBetweenTwo<Color>;
    end: Color | RandomBetweenTwo<Color>;
}
