import type { BiomeMaterial } from "../biome/definitions/BiomeModel";
import type { ColorNoiseType } from "../../utility/ColorNoise";
import type { NumberRange } from "../../definitions/Primitives";
import type { NoiseOptions, NoiseType } from "../../utility/Noise";
import type { OreId, OreName } from "./OreIdentity";

export interface OreDefinition {
    id: OreId;
    name: OreName;

    material: BiomeMaterial;
    pocket: OrePocket;
    pattern: OrePattern;

    depth: NumberRange;
}

export interface OrePocket {
    size: { x: NumberRange, y: NumberRange };
    rotation?: number;
    noise: {
        type: NoiseType;
        options: NoiseOptions;
    }
}

export interface OrePattern {
    type: ColorNoiseType;
    weights?: number[];
    scale?: number;
    angle?: number;
}
