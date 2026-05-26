import type { Size2D } from './definitions/Primitives';

import { NitrateEngine } from './NitrateEngine';

/**
 * NitrateProcess is the core infastructure for all engine singletons and classes.
 * 
 * This is modeled after Unity's "Monobehavior", providing common lifecycle related functions.
 * 
 * Available Hooks Include: `Start` | `Update` | `BeforeResize` | `OnResize` | `BeforeDestroy` | `OnDestroy`
 */
export abstract class NitrateProcess {
    constructor() {
        NitrateEngine.Register(this);
    }

    /** 
     * Called once after all processes are registered. 
     * Use for initialization that depends on other processes existing.
     */
    public Start?(): void;

    /** Called every frame with the current timestamp in milliseconds. */
    public Update?(now: number): void;


    /** 
     * Called before OnResize.
     * Awaited before any OnResize fires — use for async work that must complete before the resize.
     */
    public BeforeResize?(): Promise<void>;

    /** 
     * Called when the canvas/window is resized.
     * All BeforeResize promises have resolved before this fires.
     */
    public OnResize?(size: Size2D): void;

    /** 
     * Called before OnDestroy.
     * Awaited before any OnDestroy fires — use for async teardown.
     */
    public BeforeDestroy?(): Promise<void>;

    /** 
     * Called on engine teardown.
     * All BeforeDestroy promises have resolved before this fires.
     */
    public OnDestroy?(): void;

    protected EmitInit(): void { NitrateEngine.EmitInit(this); }

    public static OnInit(type: Function, handler: () => void | Promise<void>): void {
        NitrateEngine.OnInit(type, handler);
    }

    public static RemoveInitListener(type: Function, handler: () => void | Promise<void>): void {
        NitrateEngine.RemoveInitListener(type, handler);
    }
}
