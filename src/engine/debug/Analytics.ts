import type { AnalyticsPass } from './AnalyticsPass';
import type { Size2D } from '../definitions/Primitives';

import { MaterialRegistry } from '../materials/MaterialRegistry';

/**
 * Static analytics interface — reads per-material cell counts from the GPU.
 * @internal
 */
export class Analytics {
    private static pass: AnalyticsPass | null = null;
    private static readPending = false;

    /** Binds the analytics GPU pass. Must be called before Run or ReadAsync. */
    public static Init(pass: AnalyticsPass): void {
        Analytics.pass = pass;
    }

    /** Dispatches the analytics compute pass to count cells by material ID. */
    public static Run(encoder: GPUCommandEncoder, identityTexture: GPUTexture, size: Size2D): void {
        Analytics.pass?.Run(encoder, identityTexture, size);
    }

    /**
     * Reads the current material cell counts from the GPU asynchronously.
     * Returns an empty object if a read is already in flight.
     * */
    public static async ReadAsync(): Promise<Record<string, number>> {
        if (!Analytics.pass || Analytics.readPending) { return {}; }
        Analytics.readPending = true;
        try {
            const raw = await Analytics.pass.ReadAsync();
            const result: Record<string, number> = {};
            for (const def of Object.values(MaterialRegistry.Materials)) {
                const count = raw[def.id] ?? 0;
                if (count > 0) { result[def.name] = count; }
            }
            return result;
        } finally {
            Analytics.readPending = false;
        }
    }

    /** Reads material counts and logs them to the console as a sorted table. */
    public static Debug(): void {
        void Analytics.ReadAsync().then(counts => {
            const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
            console.table(Object.fromEntries(sorted));
        });
    }

    /** Clears the bound pass and resets pending read state. */
    public static Reset(): void {
        Analytics.pass = null;
        Analytics.readPending = false;
    }
}
