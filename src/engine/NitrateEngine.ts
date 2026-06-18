import type { Size2D } from './definitions/Primitives';

import type { NitrateProcess } from './NitrateProcess';
import { LogManager } from './debug/LogManager';
import { Time } from './time/Time';

/**
 * The engine - it provides registry for all engine singletons, de-registry and initialization processing.
 * Directly responsible for running all of the lifecycle functions.
 */
export class NitrateEngine {
    private static readonly processes: NitrateProcess[] = []; // List of all Nitrate processes
    private static readonly initListeners = new Map<Function, Array<() => void | Promise<void>>>();
    private static frame: number = 0; // The current frame

    /** Adds a process to the engine registry. Called automatically by {@link NitrateProcess}. */
    // @omitfromdocs
    public static Register(process: NitrateProcess): void {
        NitrateEngine.processes.push(process);
        LogManager.Instance?.Log({
            text: `Register: ${process.constructor.name}`,
            options: { tags: ['NitrateEngine'] }
        });
    }

    /** Removes a process from the engine registry. Called automatically by {@link NitrateProcess}. */
    // @omitfromdocs
    public static Unregister(process: NitrateProcess): void {
        const index = NitrateEngine.processes.indexOf(process);
        if (index !== -1) { NitrateEngine.processes.splice(index, 1); }
        LogManager.Instance?.Log({
            text: `Unregister: ${process.constructor.name}`,
            options: { tags: ['NitrateEngine'] }
        });
    }

    /** Registers a handler to fire when a process of the given type emits its init signal. */
    // @omitfromdocs
    public static OnInit(type: Function, handler: () => void | Promise<void>): void {
        const list = NitrateEngine.initListeners.get(type) ?? [];
        list.push(handler);
        NitrateEngine.initListeners.set(type, list);
    }

    /** Removes a previously registered init handler for the given type. */
    // @omitfromdocs
    public static RemoveInitListener(type: Function, handler: () => void | Promise<void>): void {
        const list = NitrateEngine.initListeners.get(type);
        if (!list) { return; }
        const index = list.indexOf(handler);
        if (index !== -1) { list.splice(index, 1); }
    }

    /** Fires all registered init handlers for the given process's type. Called by processes that broadcast readiness. */
    // @omitfromdocs
    public static EmitInit(source: NitrateProcess): void {
        const handlers = NitrateEngine.initListeners.get(source.constructor) ?? [];
        for (const h of handlers) { void h(); }
        LogManager.Instance?.Log({
            text: `EmitInit: ${source.constructor.name}`,
            options: { tags: ['NitrateEngine'] }
        });
    }

    /** Starts the requestAnimationFrame loop. Awake fires immediately, Start fires on the first frame before Update. */
    // @omitfromdocs
    public static Run(): void {
        NitrateEngine.Awake();
        let started = false;
        const tick = (now: number) => {
            if (!started) { NitrateEngine.Start(); started = true; }
            NitrateEngine.Update(now);
            NitrateEngine.frame = requestAnimationFrame(tick);
        };
        NitrateEngine.frame = requestAnimationFrame(tick);
        LogManager.Instance?.Log({
            text: 'Run.',
            options: { tags: ['NitrateEngine'] }
        });
    }

    /** Calls Awake on all registered processes. */
    // @omitfromdocs
    public static Awake(): void {
        for (const p of NitrateEngine.processes) p.Awake?.();
        LogManager.Instance?.Log({
            text: `Awake. (${NitrateEngine.processes.length} processes)`,
            options: { tags: ['NitrateEngine'] }
        });
    }

    /** Calls Start on all registered processes. */
    // @omitfromdocs
    public static Start(): void {
        for (const p of NitrateEngine.processes) p.Start?.();
        LogManager.Instance?.Log({
            text: `Start. (${NitrateEngine.processes.length} processes)`,
            options: { tags: ['NitrateEngine'] }
        });
    }

    /** Cancels the animation frame loop. */
    // @omitfromdocs
    public static Stop(): void {
        cancelAnimationFrame(NitrateEngine.frame);
        LogManager.Instance?.Log({
            text: 'Stop.',
            options: { tags: ['NitrateEngine'] }
        });
    }

    /** Calls Update on all registered processes. */
    // @omitfromdocs
    public static Update(now: number): void {
        Time.Tick(now);
        for (const p of NitrateEngine.processes) {
            if (p.enabled) { p.Update?.(); }
        }
    }

    /** Calls BeforeResize on all processes (awaited), then OnResize with the new size. */
    // @omitfromdocs
    public static async Resize(size: Size2D): Promise<void> {
        await Promise.all(NitrateEngine.processes.map(p => p.BeforeResize?.() ?? Promise.resolve()));
        for (const p of NitrateEngine.processes) p.OnResize?.(size);
        LogManager.Instance?.Log({
            text: `Resize: ${size.width}x${size.height}`,
            options: { tags: ['NitrateEngine'] }
        });
    }

    /** Awaits BeforeDestroy on all processes, calls OnDestroy, then clears the registry. */
    // @omitfromdocs
    public static async Destroy(): Promise<void> {
        LogManager.Instance?.Log({
            text: `Destroy. (${NitrateEngine.processes.length} processes)`,
            options: { tags: ['NitrateEngine'] }
        });
        await Promise.all(NitrateEngine.processes.map(p => p.BeforeDestroy?.() ?? Promise.resolve()));
        for (const p of NitrateEngine.processes) p.OnDestroy?.();
        NitrateEngine.processes.length = 0;
        NitrateEngine.initListeners.clear();
    }
}
