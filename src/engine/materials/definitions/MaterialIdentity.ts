import type { MaterialIds } from './Materials';

export type MaterialName = keyof typeof MaterialIds;
export type MaterialId = (typeof MaterialIds)[MaterialName];

export const OccupancyIds = {
    unoccupied: 0,
    dynamic: 1,
    static: 2
} as const;

export type MaterialOccupancy = keyof typeof OccupancyIds;
export type OccupancyId = (typeof OccupancyIds)[MaterialOccupancy];
