import type { Vec2 } from "../definitions/Primitives";
import { Utils } from "./Utils";

export enum NoiseType {
    Perlin = 'perlin',
    Ridged = 'ridged',
    Worley = 'worley',
    Voronoi = 'voronoi',
    Hash2D = 'hash2d',
    Boxes = 'boxes',
    Circles = 'circles',
}

interface NoiseParams {
    noiseType: NoiseType;
    coords: Vec2;
    seed: number;
}

export interface GetNoiseParams extends NoiseParams { options: NoiseOptions; }

export interface NoiseOptions {
    octaves?: number;
    persistence?: number;
    scale?: number;
    amplitude?: number;
}

export interface ColorNoiseParams extends NoiseParams { weights: number[]; scale?: number; }

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

    /** Returns noise functions used for color variation. */
    public static GetColorNoise(params: ColorNoiseParams): number {
        const { noiseType, coords, seed, weights, scale } = params;
        const sx = coords.x / (scale ?? 1);
        const sy = coords.y / (scale ?? 1);
        switch (noiseType) {
            case NoiseType.Boxes: return Noise.BoxesColorSeed(sx, sy, seed, weights);
            case NoiseType.Circles: return Noise.CirclesColorSeed(sx, sy, seed, weights);
            default: return 0;
        }
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

    private static WGSLFract(x: number): number {
        return x - Math.floor(x);
    }

    // 123.34 → fract 17/50, period 50. 123.4321 → fract 4321/10000, period 10000.
    // Same structure as brush.wgsl hash() but with long-period constants for world-scale use.
    private static WGSLHash(px: number, py: number): number {
        const qx = Noise.WGSLFract(px * 123.4321);
        const qy = Noise.WGSLFract(py * 456.7891);
        const d = qx * (qx + 45.3219) + qy * (qy + 45.3219);
        return Noise.WGSLFract((qx + d) * (qy + d));
    }

    // Weights must be pre-normalized (sum to 1.0). Returns bucket index 0–(weights.length-1).
    private static CdfBucket(hash: number, weights: number[]): number {
        let cumulative = 0;
        for (let i = 0; i < weights.length - 1; i++) {
            cumulative += weights[i];
            if (hash < cumulative) { return i; }
        }
        return weights.length - 1;
    }

    private static BoxesColorSeed(x: number, y: number, seed: number, weights: number[]): number {
        const bx = Math.floor(x / 2);
        const by = Math.floor(y / 2);
        const sizeHash = Noise.WGSLHash(bx + 7.31 + seed, by + 43.17 + seed);
        const cellX = sizeHash < 0.6 ? bx : Math.floor(x);
        const cellY = sizeHash < 0.6 ? by : Math.floor(y);
        return Noise.CdfBucket(Noise.WGSLHash(cellX + 91.37 + seed, cellY + 17.73 + seed), weights);
    }

    private static CirclesColorSeed(x: number, y: number, seed: number, weights: number[]): number {
        const bx4 = Math.floor(x / 4);
        const by4 = Math.floor(y / 4);
        const sizeHash = Noise.WGSLHash(bx4 + 23.17 + seed, by4 + 71.31 + seed);
        let cellHash: number;
        if (sizeHash < 0.6) {
            const centerX = bx4 * 4 + 2;
            const centerY = by4 * 4 + 2;
            const inSplotch = Math.sqrt((Math.floor(x) + 0.5 - centerX) ** 2 + (Math.floor(y) + 0.5 - centerY) ** 2) < 1.65;
            cellHash = inSplotch
                ? Noise.WGSLHash(bx4 + 91.37 + seed, by4 + 17.73 + seed)
                : Noise.WGSLHash(Math.floor(x) + 37.13 + seed, Math.floor(y) + 61.91 + seed);
        } else {
            const bx3 = Math.floor(x / 3);
            const by3 = Math.floor(y / 3);
            const centerX = bx3 * 3 + 1.5;
            const centerY = by3 * 3 + 1.5;
            const dx = Math.abs(Math.floor(x) + 0.5 - centerX);
            const dy = Math.abs(Math.floor(y) + 0.5 - centerY);
            const inSplotch = (dx + dy) < 1.5;
            cellHash = inSplotch
                ? Noise.WGSLHash(bx3 + 91.37 + seed, by3 + 17.73 + seed)
                : Noise.WGSLHash(Math.floor(x) + 37.13 + seed, Math.floor(y) + 61.91 + seed);
        }
        return Noise.CdfBucket(cellHash, weights);
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
