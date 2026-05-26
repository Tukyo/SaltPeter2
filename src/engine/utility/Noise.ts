import type { Vec2 } from "../definitions/Primitives";
import { Utils } from "./Utils";

export enum NoiseType {
    Perlin = 'perlin',
    Ridged = 'ridged',
    Worley = 'worley',
    Voronoi = 'voronoi',
    Hash2D = 'hash2d'
}

export interface GetNoiseParams {
    noiseType: NoiseType;
    coords: Vec2;
    seed: number;
    options: NoiseOptions;
}

export interface NoiseOptions {
    octaves?: number;
    persistence?: number;
    scale?: number;
    amplitude?: number;
}

/** Utility class that provides general noise-based math. */
export class Noise {
    /** Helper function to switch between noise types */
    public static GetNoise(params: GetNoiseParams): number {
        const { noiseType, coords, seed, options } = params;
        const sx = coords.x / (options?.scale ?? 1);
        const sy = coords.y / (options?.scale ?? 1);
        const amp = options?.amplitude ?? 1;
        let raw: number;
        switch (noiseType) {
            case NoiseType.Perlin:
                raw = Noise.PerlinNoise(sx, sy, seed, options?.octaves ?? 1, options?.persistence ?? 0.5);
                break;
            case NoiseType.Ridged:
                raw = Noise.RidgedNoise(sx, sy, seed, options?.octaves ?? 1, options?.persistence ?? 0.5);
                break;
            case NoiseType.Worley:
                raw = Noise.WorleyNoise(sx, sy, seed, Math.max(1, Math.floor(options?.octaves ?? 1)));
                break;
            case NoiseType.Voronoi:
                raw = Noise.VoronoiNoise(sx, sy, seed);
                break;
            case NoiseType.Hash2D:
                raw = Noise.Hash2D(sx, sy, seed);
                break;
            default:
                raw = Noise.PerlinNoise(sx, sy, seed);
        }
        return (raw * 2 - 1) * amp;
    }

    /**
     * Generates a deterministic pseudo-random value from integer coordinates and a seed.
     *
     * Uses a fast 2D hash function to produce a normalized float in [0, 1].
     */
    public static Hash2D(x: number, y: number, seed: number): number {
        const n = x * 374761393 + y * 668265263 + seed;
        const hash = (n ^ (n >> 13)) * 1274126177;
        return ((hash ^ (hash >> 16)) & 0x7fffffff) / 0x7fffffff;
    }

    private static PerlinNoise(x: number, y: number, seed: number, octaves: number = 1, persistence: number = 1): number {
        let total = 0, frequency = 1, octaveWeight = 1, maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            total += Noise.InterpolateNoise(x * frequency, y * frequency, seed + i * 1000) * octaveWeight;
            maxValue += octaveWeight;
            octaveWeight *= persistence;
            frequency *= 2;
        }
        return total / maxValue;
    }

    private static RidgedNoise(x: number, y: number, seed: number, octaves: number = 1, persistence: number = 0.5): number {
        let total = 0, frequency = 1, octaveWeight = 1, maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            let noise = Noise.InterpolateNoise(x * frequency, y * frequency, seed + i * 1000);
            noise = 1 - Math.abs(noise);
            total += noise * octaveWeight;
            maxValue += octaveWeight;
            octaveWeight *= persistence;
            frequency *= 2;
        }
        return total / maxValue;
    }

    private static WorleyNoise(x: number, y: number, seed: number, pointsPerCell: number = 1): number {
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        let minDist = Infinity;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const cx = cellX + dx;
                const cy = cellY + dy;
                for (let p = 0; p < pointsPerCell; p++) {
                    const px = cx + Noise.Hash2D(cx, cy, seed + p * 10000);
                    const py = cy + Noise.Hash2D(cx, cy, seed + p * 10000 + 1);
                    const ddx = x - px;
                    const ddy = y - py;
                    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (dist < minDist) { minDist = dist; }
                }
            }
        }
        return Utils.Normalize(minDist / 1.5);
    }

    private static VoronoiNoise(x: number, y: number, seed: number): number {
        return Noise.WorleyNoise(x, y, seed, 1);
    }

    private static InterpolateNoise(x: number, y: number, seed: number): number {
        const ix = Math.floor(x), fx = x - ix;
        const iy = Math.floor(y), fy = y - iy;
        const v1 = Noise.Hash2D(ix, iy, seed);
        const v2 = Noise.Hash2D(ix + 1, iy, seed);
        const v3 = Noise.Hash2D(ix, iy + 1, seed);
        const v4 = Noise.Hash2D(ix + 1, iy + 1, seed);
        const sx = Utils.Smoothstep(fx);
        const sy = Utils.Smoothstep(fy);
        return Utils.Lerp(Utils.Lerp(v1, v2, sx), Utils.Lerp(v3, v4, sx), sy);
    }
}
