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
    private _enabled: boolean = true;

    /** Registers a process with the engine. */
    protected Register(): void { NitrateEngine.Register(this); }

    /** Unregisters a process with the engine. */
    protected Unregister(): void { NitrateEngine.Unregister(this); }

    /** 
     * Called once after all processes are registered. 
     * Use for initialization that depends on other processes existing.
     */
    public Awake?(): void;

    /**
     * Called one frame after awake. Everything created in awake is available on Start.
     */
    public Start?(): void;

    /** Called every frame. Use {@link Time} for timing values. */
    public Update?(): void;

    /** Fires when an engine process is enabled. */
    public OnEnable?(): void;

    /** Fires when an engine process is disabled. */
    public OnDisable?(): void;

    /** Gets the enabled state of an engine process */
    public get enabled(): boolean { return this._enabled }

    /** Sets the enabled state of an engine process. */
    public set enabled(value: boolean) {
        if (this._enabled === value) { return; }
        this._enabled = value;
        if (value) { this.OnEnable?.(); }
        else { this.OnDisable?.(); }
    }

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
