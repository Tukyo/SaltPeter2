import type { BiomeIds } from './Biomes';

export type BiomeName = keyof typeof BiomeIds;
export type BiomeId = (typeof BiomeIds)[BiomeName];