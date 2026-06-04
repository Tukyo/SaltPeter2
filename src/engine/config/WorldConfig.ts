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
                noiseType: NoiseType.Perlin, // Noise algorithm used to shape the terrain.
                octaves: 4, // Number of noise layers stacked — more = more surface detail.
                persistence: 0.5, // How much each octave contributes — higher = rougher, lower = smoother.
                scale: 128, // Horizontal zoom of the noise — higher = broader hills, lower = tighter hills.
                amplitude: 64, // Max height variation in cells — controls how tall or flat the terrain is.
            },
            detail: { // Perturbs depth per cell to speckle layer boundaries
                noiseType: NoiseType.Perlin,
                octaves: 3,
                persistence: 0.5,
                scale: 16, // tighter = more speckled
                amplitude: 12, // thickness of the transition zone
            },
            blend: { // Perturbs biome lookup position to blur biome boundaries
                noiseType: NoiseType.Perlin,
                octaves: 2,
                persistence: 0.5,
                scale: 48,
                amplitude: 64,
            }
        },
        performance: {
            scale: 0.25, // Sets the resolution scale for scenes that have a world
            simDebounce: 4 // Debouncer that pauses the sim for n frames when blitting
        },
        save: {
            worldPath: 'World',
            chunkPath: (cx: number, cy: number) => `Chunks/chunk_${cx}_${cy}.bin`,
        }
    }

    /** Returns the world configuration. */
    public static GetConfig() {
        return WorldConfig.config;
    }
}