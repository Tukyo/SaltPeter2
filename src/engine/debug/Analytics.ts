import type { AnalyticsPass } from './AnalyticsPass';
import type { Size2D } from '../definitions/Primitives';

import { MaterialRegistry } from '../materials/MaterialRegistry';

// @omitfromdocs
export interface AnalyticsCounts {
    simulation: Record<string, number>;
    gameObject: Record<string, number>;
}

/**
 * Static analytics interface — reads per-material cell counts from the GPU.
 * @internal
 */
export class Analytics {
    private static simPass: AnalyticsPass | null = null;
    private static goPass: AnalyticsPass | null = null;
    private static readPending = false;

    /** Binds the analytics GPU passes. Must be called before Run or ReadAsync. */
    public static Init(simPass: AnalyticsPass, goPass: AnalyticsPass): void {
        Analytics.simPass = simPass;
        Analytics.goPass = goPass;
    }

    /** Dispatches the analytics compute pass over both identity textures. */
    public static Run(
        encoder: GPUCommandEncoder,
        simIdentity: GPUTexture,
        goIdentity: GPUTexture,
        size: Size2D
    ): void {
        Analytics.simPass?.Run(encoder, simIdentity, size);
        Analytics.goPass?.Run(encoder, goIdentity, size);
    }

    /**
     * Reads the current material cell counts from the GPU asynchronously.
     * Returns empty counts if a read is already in flight.
     */
    public static async ReadAsync(): Promise<AnalyticsCounts> {
        if (!Analytics.simPass || !Analytics.goPass || Analytics.readPending) {
            return { simulation: {}, gameObject: {} };
        }
        Analytics.readPending = true;
        try {
            const [simRaw, goRaw] = await Promise.all([
                Analytics.simPass.ReadAsync(),
                Analytics.goPass.ReadAsync(),
            ]);
            return {
                simulation: Analytics.decodeRaw(simRaw),
                gameObject: Analytics.decodeRaw(goRaw),
            };
        } finally {
            Analytics.readPending = false;
        }
    }

    /** Reads material counts and logs both layers to the console as sorted tables. */
    public static Debug(): void {
        void Analytics.ReadAsync().then(({ simulation, gameObject }) => {
            console.group('Scene Analytics');
            console.group('Simulation');
            console.table(Object.fromEntries(Object.entries(simulation).sort(([, a], [, b]) => b - a)));
            console.groupEnd();
            console.group('GameObject');
            console.table(Object.fromEntries(Object.entries(gameObject).sort(([, a], [, b]) => b - a)));
            console.groupEnd();
            console.groupEnd();
        });
    }

    /** Clears the bound passes and resets pending read state. */
    public static Reset(): void {
        Analytics.simPass = null;
        Analytics.goPass = null;
        Analytics.readPending = false;
    }

    private static decodeRaw(raw: Uint32Array): Record<string, number> {
        const result: Record<string, number> = {};
        for (const def of Object.values(MaterialRegistry.Materials)) {
            const count = raw[def.id] ?? 0;
            if (count > 0) { result[def.name] = count; }
        }
        return result;
    }
}
