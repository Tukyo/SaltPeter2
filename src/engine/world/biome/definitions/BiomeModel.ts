import type { NumberRange } from "../../../definitions/Primitives";
import type { MaterialName, MaterialOccupancy } from "../../../materials/definitions/MaterialIdentity";
import type { BiomeId, BiomeName } from "./BiomeIdentity";

// References:
// https://noita.wiki.gg/wiki/Biomes
// https://noita.wiki.gg/wiki/World_generation

export interface BiomeDefinition {
    id: BiomeId;
    name: BiomeName;
    layers: readonly BiomeLayer[];
}

export interface BiomeMaterial {
    name: MaterialName;
    occupancy: MaterialOccupancy;
    weight: number;
}

export interface BiomeLayer {
    material: BiomeMaterial;
    depth: NumberRange;
}
