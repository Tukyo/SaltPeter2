import type { OreIds } from './Ores';

export type OreName = keyof typeof OreIds;
export type OreId = (typeof OreIds)[OreName];