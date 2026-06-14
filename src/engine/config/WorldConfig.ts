import type { NoiseOptions } from '../utility/Noise';
import { NoiseType } from '../utility/Noise';

/** Parameters governing world layout, generation, and streaming. */
export class WorldConfig {
    private static readonly config = {
        chunk: {
            size: 128,
            margin: 2, // Extra chunks loaded on each side of the viewport (invisible buffer zone).
        },
        cell: {
            identityBytes: 4, // rgba8unorm: materialId, colorSeed, variantId, occupancy
            physicsBytes: 16, // rgba32float: temperature, pressure, velocityX, velocityY
            stateBytes: 16, // rgba32float: health, lifetime, unused, unused
        },
        dev: {
            wipeSaveOnLoad: true
        },
        generation: {
            spawnOffset: { cx: 10, cy: 0 }, // Shifts the origin of the worldgen by cx, cy
            terrain: { // Base pass of the worldgen
                noiseType: NoiseType.Perlin,
                options: {
                    octaves: 4,
                    persistence: 0.5,
                    scale: 128,
                    amplitude: 64
                } satisfies NoiseOptions
            },
            detail: { // Perturbs depth per cell to speckle layer boundaries
                noiseType: NoiseType.Perlin,
                options: {
                    octaves: 3,
                    persistence: 0.5,
                    scale: 16,
                    amplitude: 12
                } satisfies NoiseOptions
            },
            blend: { // Perturbs biome lookup position to blur biome boundaries
                noiseType: NoiseType.Perlin,
                options: {
                    octaves: 2,
                    persistence: 0.5,
                    scale: 48,
                    amplitude: 64
                } satisfies NoiseOptions
            }
        },
        performance: {
            scale: 0.25, // Sets the resolution scale for scenes that have a world
            simDebounce: 4 // Debouncer that pauses the sim for n frames when blitting
        }
    }

    /** Returns the world configuration. */
    public static GetConfig() { return WorldConfig.config; }
}