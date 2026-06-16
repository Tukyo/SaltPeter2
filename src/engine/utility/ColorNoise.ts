import type { Vec2 } from "../definitions/Primitives";

export enum ColorNoiseType {
    Boxes = 'boxes',
    Circles = 'circles',
    Scatter = 'scatter',
    Stripes = 'stripes'
}

interface ColorNoiseParams {
    noiseType: ColorNoiseType;
    coords: Vec2;
    seed: number;
    weights?: number[];
    scale?: number;
    angle?: number;
}

export class ColorNoise {
    /** Returns a 0–1 float encoding which color bucket this cell belongs to. Callers use Math.round(result * 255) for colorSeed. */
    public static GetColorNoise(params: ColorNoiseParams): number {
        const { noiseType, coords, seed, weights, scale, angle } = params;
        const sx = coords.x / (scale ?? 1);
        const sy = coords.y / (scale ?? 1);
        switch (noiseType) {
            case ColorNoiseType.Boxes: return ColorNoise.BoxesColorSeed(sx, sy, seed, weights ?? [1]);
            case ColorNoiseType.Circles: return ColorNoise.CirclesColorSeed(sx, sy, seed, weights ?? [1]);
            case ColorNoiseType.Scatter: return ColorNoise.ScatterColorSeed(coords.x, coords.y, seed);
            case ColorNoiseType.Stripes: return ColorNoise.StripesColorSeed(coords.x, coords.y, seed, scale ?? 4, angle ?? 0);
        }
    }

    private static WGSLFract(x: number): number {
        return x - Math.floor(x);
    }

    // Same structure as brush.wgsl hash() but with long-period constants for world-scale use.
    private static WGSLHash(px: number, py: number): number {
        const qx = ColorNoise.WGSLFract(px * 123.4321);
        const qy = ColorNoise.WGSLFract(py * 456.7891);
        const d = qx * (qx + 45.3219) + qy * (qy + 45.3219);
        return ColorNoise.WGSLFract((qx + d) * (qy + d));
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

    // Returns bucket center as 0-1 float: (index + 0.5) / count
    private static BoxesColorSeed(x: number, y: number, seed: number, weights: number[]): number {
        const bx = Math.floor(x / 2);
        const by = Math.floor(y / 2);
        const sizeHash = ColorNoise.WGSLHash(bx + 7.31 + seed, by + 43.17 + seed);
        const cellX = sizeHash < 0.6 ? bx : Math.floor(x);
        const cellY = sizeHash < 0.6 ? by : Math.floor(y);
        const bucket = ColorNoise.CdfBucket(ColorNoise.WGSLHash(cellX + 91.37 + seed, cellY + 17.73 + seed), weights);
        return (bucket + 0.5) / weights.length;
    }

    // Returns bucket center as 0-1 float: (index + 0.5) / count
    private static CirclesColorSeed(x: number, y: number, seed: number, weights: number[]): number {
        const bx4 = Math.floor(x / 4);
        const by4 = Math.floor(y / 4);
        const sizeHash = ColorNoise.WGSLHash(bx4 + 23.17 + seed, by4 + 71.31 + seed);
        let cellHash: number;
        if (sizeHash < 0.6) {
            const centerX = bx4 * 4 + 2;
            const centerY = by4 * 4 + 2;
            const inSplotch = Math.sqrt((Math.floor(x) + 0.5 - centerX) ** 2 + (Math.floor(y) + 0.5 - centerY) ** 2) < 1.65;
            cellHash = inSplotch
                ? ColorNoise.WGSLHash(bx4 + 91.37 + seed, by4 + 17.73 + seed)
                : ColorNoise.WGSLHash(Math.floor(x) + 37.13 + seed, Math.floor(y) + 61.91 + seed);
        } else {
            const bx3 = Math.floor(x / 3);
            const by3 = Math.floor(y / 3);
            const centerX = bx3 * 3 + 1.5;
            const centerY = by3 * 3 + 1.5;
            const dx = Math.abs(Math.floor(x) + 0.5 - centerX);
            const dy = Math.abs(Math.floor(y) + 0.5 - centerY);
            const inSplotch = (dx + dy) < 1.5;
            cellHash = inSplotch
                ? ColorNoise.WGSLHash(bx3 + 91.37 + seed, by3 + 17.73 + seed)
                : ColorNoise.WGSLHash(Math.floor(x) + 37.13 + seed, Math.floor(y) + 61.91 + seed);
        }
        const bucket = ColorNoise.CdfBucket(cellHash, weights);
        return (bucket + 0.5) / weights.length;
    }

    // Returns a raw 0-1 hash per cell — matches brush.wgsl scatter exactly.
    private static ScatterColorSeed(x: number, y: number, seed: number): number {
        return ColorNoise.WGSLHash(Math.floor(x) + 37.13 + seed, Math.floor(y) + 61.91 + seed);
    }

    // angle in radians; scale = stripe width in world cells.
    private static StripesColorSeed(x: number, y: number, seed: number, scale: number, angle: number): number {
        const proj = x * Math.cos(angle) + y * Math.sin(angle);
        return ColorNoise.WGSLHash(Math.floor(proj / scale) + seed, 99.17 + seed);
    }
}
