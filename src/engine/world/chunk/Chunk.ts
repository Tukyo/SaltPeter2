import { LogManager } from '../../debug/LogManager';
import { WorldConfig } from "../../config/WorldConfig";

/** Static helpers for computing sim texture dimensions and shift thresholds from canvas size and chunk config. */
export class Chunk {
    /**
     * Cells wide the sim texture must be for a given canvas width. 
     * Rounds up to the nearest chunk boundary then adds margin on both sides.
     * @internal
     */
    public static GetSimWidth(canvasWidth: number): number {
        const { chunk } = WorldConfig.GetConfig();
        const result = (Math.ceil(canvasWidth / chunk.size) + 2 * chunk.margin) * chunk.size;
        LogManager.Instance?.Log({
            text: `GetSimWidth: canvas ${canvasWidth}px → ${result} cells`,
            options: { tags: ['Chunk'] }
        });
        return result;
    }

    /**
     * Cells tall the sim texture must be for a given canvas height.
     * Rounds up to the nearest chunk boundary then adds margin on both sides.
     * @internal
     */
    public static GetSimHeight(canvasHeight: number): number {
        const { chunk } = WorldConfig.GetConfig();
        const result = (Math.ceil(canvasHeight / chunk.size) + 2 * chunk.margin) * chunk.size;
        LogManager.Instance?.Log({
            text: `GetSimHeight: canvas ${canvasHeight}px → ${result} cells`,
            options: { tags: ['Chunk'] }
        });
        return result;
    }

    /**
     * Distance in cells from the sim edge at which a chunk shift fires. 
     * Equal to one margin's worth of chunks, keeping the cleared edge off-camera.
     * @internal
     */
    public static GetShiftThreshold(): number {
        const { chunk } = WorldConfig.GetConfig();
        const result = chunk.margin * chunk.size;
        LogManager.Instance?.Log({
            text: `GetShiftThreshold: ${result} cells`,
            options: { tags: ['Chunk'], noisy: true }
        });
        return result;
    }
}
