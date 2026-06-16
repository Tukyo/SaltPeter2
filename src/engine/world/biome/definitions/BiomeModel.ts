import type { BiomeId, BiomeName } from "./BiomeIdentity";
import type { MaterialName, MaterialOccupancy } from "../../../materials/definitions/MaterialIdentity";
import type { NoiseOptions, NoiseType } from "../../../utility/Noise";
import type { ColorNoiseType } from "../../../utility/ColorNoise";
import type { NumberRange } from "../../../definitions/Primitives";
import type { OreName } from "../../ore/OreIdentity";

// References:
// https://noita.wiki.gg/wiki/Biomes
// https://noita.wiki.gg/wiki/World_generation

export interface BiomeDefinition {
    id: BiomeId;
    name: BiomeName;
    layers: readonly BiomeLayer[];
    stamps?: BiomeStampMaterialMap;
    detail?: BiomeDetail;
    ores?: readonly OreName[];
}

export interface BiomeMaterial {
    name: MaterialName;
    occupancy: MaterialOccupancy;
    variantId?: number;
}

export interface BiomeLayer {
    material: BiomeLayerMaterial;
    depth: NumberRange;
    detail?: BiomeLayerDetail;
}

export interface BiomeLayerDetail {
    color?: {
        type: ColorNoiseType;
        scale: number;
        weights: number[];
    }
}

export interface BiomeLayerMaterial extends BiomeMaterial { weight: number; }

export interface BiomeFloodFillMaterial extends BiomeMaterial { weight: number; }

export interface BiomeStampMaterialMap {
    solid: BiomeMaterial;
    powder: BiomeFloodFillMaterial[];
    liquid: BiomeFloodFillMaterial[];
    detail?: BiomeMaterial;
}

export interface BiomeDetail {
    material: BiomeMaterial;
    threshold: number;
    noise: {
        type: NoiseType;
        options: NoiseOptions;
    }
}
