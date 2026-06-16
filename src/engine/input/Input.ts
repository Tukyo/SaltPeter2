import type { Vec2 } from '../definitions/Primitives';

import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { Utils } from '../utility/Utils';

export interface MouseState {
    canvas: { pos: Vec2; isInside: boolean; }
    screen: { pos: Vec2; }
    leftDown: boolean;
    middleDown: boolean;
    rightDown: boolean;
}

export type MouseButton = 0 | 1 | 2;

/**
 * Tracks mouse and keyboard input. All input should flow through this class
 * so that guardrails like blur-clearing apply universally.
 *
 * ```ts
 * new Nitrate.Input(canvas);
 * ```
 */
export class Input extends NitrateProcess {
    public static Instance: Input | null = null;

    private readonly canvas: HTMLCanvasElement;
    private onBlur: () => void = () => { };

    constructor(canvas: HTMLCanvasElement) {
        super();
        Input.Instance = this;

        this.canvas = canvas;

        this.InitMouse(canvas);
        this.InitKeyboard();
    }

    public Start(): void {
        LogManager.Instance?.Log({
            text: 'Input start.',
            options: { tags: ['Input', 'NitrateProcessInit'] }
        });
    }

    //#region MOUSE
    private mouse: MouseState = {
        canvas: { pos: { x: 0, y: 0 }, isInside: false },
        screen: { pos: { x: 0, y: 0 } },
        leftDown: false,
        middleDown: false,
        rightDown: false,
    };

    private onScreenMouseMove: (e: MouseEvent) => void = () => { };
    private onScreenMouseDown: (e: MouseEvent) => void = () => { };
    private onScreenMouseUp: (e: MouseEvent) => void = () => { };

    private readonly screenMouseDownCallbacks: Map<MouseButton, Set<(e: MouseEvent) => void>> = new Map();
    private readonly screenMouseUpCallbacks: Map<MouseButton, Set<(e: MouseEvent) => void>> = new Map();
    private readonly screenMouseMoveCallbacks: Set<(e: MouseEvent) => void> = new Set();

    private onCanvasMouseMove: (e: MouseEvent) => void = () => { };
    private onCanvasMouseDown: (e: MouseEvent) => void = () => { };
    private onCanvasMouseUp: (e: MouseEvent) => void = () => { };
    private onCanvasMouseLeave: () => void = () => { };

    private readonly canvasMouseDownCallbacks: Map<MouseButton, Set<(e: MouseEvent) => void>> = new Map();
    private readonly canvasMouseUpCallbacks: Map<MouseButton, Set<(e: MouseEvent) => void>> = new Map();
    private readonly canvasMouseMoveCallbacks: Set<(e: MouseEvent) => void> = new Set();

    private InitMouse(canvas: HTMLCanvasElement): void {
        this.onScreenMouseMove = (e: MouseEvent) => {
            this.mouse.screen.pos.x = e.clientX;
            this.mouse.screen.pos.y = e.clientY;
            this.screenMouseMoveCallbacks.forEach(cb => cb(e));
        };

        this.onScreenMouseDown = (e: MouseEvent) => {
            if (e.button === 0) { this.mouse.leftDown = true; }
            if (e.button === 1) { e.preventDefault(); this.mouse.middleDown = true; }
            if (e.button === 2) { this.mouse.rightDown = true; }
            this.screenMouseDownCallbacks.get(e.button as MouseButton)?.forEach(cb => cb(e));
            LogManager.Instance?.Log({
                text: 'Mouse button pressed.',
                options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse }
            });
        };

        this.onScreenMouseUp = (e: MouseEvent) => {
            if (e.button === 0) { this.mouse.leftDown = false; }
            if (e.button === 1) { this.mouse.middleDown = false; }
            if (e.button === 2) { this.mouse.rightDown = false; }
            this.screenMouseUpCallbacks.get(e.button as MouseButton)?.forEach(cb => cb(e));
            LogManager.Instance?.Log({
                text: 'Mouse button released.',
                options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse }
            });
        };

        this.onCanvasMouseMove = (e: MouseEvent) => {
            this.UpdateCanvasPosition(e);
            this.mouse.canvas.isInside = true;
            this.canvasMouseMoveCallbacks.forEach(cb => cb(e));
            LogManager.Instance?.Log({
                text: 'Mouse moved over canvas.',
                options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse.canvas.pos }
            });
        };

        this.onCanvasMouseDown = (e: MouseEvent) => {
            this.UpdateCanvasPosition(e);
            this.mouse.canvas.isInside = true;
            this.canvasMouseDownCallbacks.get(e.button as MouseButton)?.forEach(cb => cb(e));
            LogManager.Instance?.Log({
                text: 'Mouse pressed on canvas.',
                options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse.canvas.pos }
            });
        };

        this.onCanvasMouseUp = (e: MouseEvent) => {
            this.canvasMouseUpCallbacks.get(e.button as MouseButton)?.forEach(cb => cb(e));
            LogManager.Instance?.Log({
                text: 'Mouse released on canvas.',
                options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse.canvas.pos }
            });
        };

        this.onCanvasMouseLeave = () => {
            this.mouse.canvas.isInside = false;
            LogManager.Instance?.Log({
                text: 'Mouse left canvas bounds.',
                options: { noisy: true, tags: ['Input', 'Mouse'] }
            });
        };

        window.addEventListener('mousemove', this.onScreenMouseMove);
        window.addEventListener('mousedown', this.onScreenMouseDown);
        window.addEventListener('mouseup', this.onScreenMouseUp);
        canvas.addEventListener('mousemove', this.onCanvasMouseMove);
        canvas.addEventListener('mousedown', this.onCanvasMouseDown);
        canvas.addEventListener('mouseup', this.onCanvasMouseUp);
        canvas.addEventListener('mouseleave', this.onCanvasMouseLeave);
    }

    /** Returns a snapshot of the current mouse state. */
    public GetMouseState(): MouseState { return { ...this.mouse }; }

    /** Subscribes to mousemove on the screen (window-level). Returns an unsubscribe function. */
    public OnScreenMouseMove(callback: (e: MouseEvent) => void): () => void {
        this.screenMouseMoveCallbacks.add(callback);
        return () => { this.screenMouseMoveCallbacks.delete(callback); };
    }

    /** Subscribes to mousedown (window-level) for a specific button. Returns an unsubscribe function. */
    public OnScreenMouseDown(button: MouseButton, callback: (e: MouseEvent) => void): () => void {
        if (!this.screenMouseDownCallbacks.has(button)) { this.screenMouseDownCallbacks.set(button, new Set()); }
        const set = this.screenMouseDownCallbacks.get(button);
        if (set) { set.add(callback); }
        return () => { this.screenMouseDownCallbacks.get(button)?.delete(callback); };
    }

    /** Subscribes to mouseup (window-level) for a specific button. Returns an unsubscribe function. */
    public OnScreenMouseUp(button: MouseButton, callback: (e: MouseEvent) => void): () => void {
        if (!this.screenMouseUpCallbacks.has(button)) { this.screenMouseUpCallbacks.set(button, new Set()); }
        const set = this.screenMouseUpCallbacks.get(button);
        if (set) { set.add(callback); }
        return () => { this.screenMouseUpCallbacks.get(button)?.delete(callback); };
    }

    /** Subscribes to mousemove on the canvas. Returns an unsubscribe function. */
    public OnCanvasMouseMove(callback: (e: MouseEvent) => void): () => void {
        this.canvasMouseMoveCallbacks.add(callback);
        return () => { this.canvasMouseMoveCallbacks.delete(callback); };
    }

    /** Subscribes to mousedown on the canvas for a specific button. Returns an unsubscribe function. */
    public OnCanvasMouseDown(button: MouseButton, callback: (e: MouseEvent) => void): () => void {
        if (!this.canvasMouseDownCallbacks.has(button)) { this.canvasMouseDownCallbacks.set(button, new Set()); }
        const set = this.canvasMouseDownCallbacks.get(button);
        if (set) { set.add(callback); }
        return () => { this.canvasMouseDownCallbacks.get(button)?.delete(callback); };
    }

    /** Subscribes to mouseup on the canvas for a specific button. Returns an unsubscribe function. */
    public OnCanvasMouseUp(button: MouseButton, callback: (e: MouseEvent) => void): () => void {
        if (!this.canvasMouseUpCallbacks.has(button)) { this.canvasMouseUpCallbacks.set(button, new Set()); }
        const set = this.canvasMouseUpCallbacks.get(button);
        if (set) { set.add(callback); }
        return () => { this.canvasMouseUpCallbacks.get(button)?.delete(callback); };
    }

    /** Resets all mouse state to defaults. Call on scene transitions to prevent stale input. */
    public ResetMouseState(): void {
        this.mouse.canvas.pos = { x: 0, y: 0 };
        this.mouse.canvas.isInside = false;
        this.mouse.screen.pos = { x: 0, y: 0 };
        this.mouse.leftDown = false;
        this.mouse.middleDown = false;
        this.mouse.rightDown = false;
    }

    /** Computes canvas-relative mouse position from a DOM mouse event and flips Y to sim-space. */
    private UpdateCanvasPosition(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const normalizedX = (e.clientX - rect.left) / rect.width;
        const normalizedY = (e.clientY - rect.top) / rect.height;
        this.mouse.canvas.pos.x = normalizedX * this.canvas.width;
        this.mouse.canvas.pos.y = Utils.FlipY(normalizedY * this.canvas.height, this.canvas.height);
    }
    //#endregion

    //#region KEYBOARD
    private onKeyDown: (e: KeyboardEvent) => void = () => { };
    private onKeyUp: (e: KeyboardEvent) => void = () => { };
    private readonly keysDown: Set<string> = new Set();
    private readonly codesDown: Set<string> = new Set();
    private readonly keyDownCallbacks: Map<string, Set<() => void>> = new Map();
    private readonly keyUpCallbacks: Map<string, Set<() => void>> = new Map();
    private readonly keyCodeDownCallbacks: Map<string, Set<() => void>> = new Map();
    private readonly keyCodeUpCallbacks: Map<string, Set<() => void>> = new Map();

    private InitKeyboard(): void {
        this.onKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).closest('input, textarea')) { return; }
            if (!this.keysDown.has(e.key)) {
                this.keysDown.add(e.key);
                this.keyDownCallbacks.get(e.key)?.forEach(cb => cb());
            }
            if (!this.codesDown.has(e.code)) {
                this.codesDown.add(e.code);
                this.keyCodeDownCallbacks.get(e.code)?.forEach(cb => cb());
            }
        };

        this.onKeyUp = (e: KeyboardEvent) => {
            if (this.keysDown.has(e.key)) {
                this.keysDown.delete(e.key);
                this.keyUpCallbacks.get(e.key)?.forEach(cb => cb());
            }
            if (this.codesDown.has(e.code)) {
                this.codesDown.delete(e.code);
                this.keyCodeUpCallbacks.get(e.code)?.forEach(cb => cb());
            }
        };

        this.onBlur = () => {
            for (const key of this.keysDown) { this.keyUpCallbacks.get(key)?.forEach(cb => cb()); }
            this.keysDown.clear();
            for (const code of this.codesDown) { this.keyCodeUpCallbacks.get(code)?.forEach(cb => cb()); }
            this.codesDown.clear();
            this.ResetMouseState();
        };

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
    }

    /** Returns true while the given key is held (by key value). */
    public IsKeyDown(key: string): boolean { return this.keysDown.has(key); }

    /** Returns true while the given key is held (by key code, e.g. 'Numpad0'). */
    public IsKeyCodeDown(code: string): boolean { return this.codesDown.has(code); }

    /** Subscribes to the first keydown for a key value (repeat events ignored). Returns an unsubscribe function. */
    public OnKeyDown(key: string, callback: () => void): () => void {
        if (!this.keyDownCallbacks.has(key)) { this.keyDownCallbacks.set(key, new Set()); }
        const set = this.keyDownCallbacks.get(key);
        if (set) { set.add(callback); }
        return () => { this.keyDownCallbacks.get(key)?.delete(callback); };
    }

    /** Subscribes to keyup for a key value. Returns an unsubscribe function. */
    public OnKeyUp(key: string, callback: () => void): () => void {
        if (!this.keyUpCallbacks.has(key)) { this.keyUpCallbacks.set(key, new Set()); }
        const set = this.keyUpCallbacks.get(key);
        if (set) { set.add(callback); }
        return () => { this.keyUpCallbacks.get(key)?.delete(callback); };
    }

    /** Subscribes to the first keydown for a key code (e.g. 'Numpad0', repeat ignored). Returns an unsubscribe function. */
    public OnKeyCode(code: string, callback: () => void): () => void {
        if (!this.keyCodeDownCallbacks.has(code)) { this.keyCodeDownCallbacks.set(code, new Set()); }
        const set = this.keyCodeDownCallbacks.get(code);
        if (set) { set.add(callback); }
        return () => { this.keyCodeDownCallbacks.get(code)?.delete(callback); };
    }

    /** Subscribes to keyup for a key code. Returns an unsubscribe function. */
    public OnKeyCodeUp(code: string, callback: () => void): () => void {
        if (!this.keyCodeUpCallbacks.has(code)) { this.keyCodeUpCallbacks.set(code, new Set()); }
        const set = this.keyCodeUpCallbacks.get(code);
        if (set) { set.add(callback); }
        return () => { this.keyCodeUpCallbacks.get(code)?.delete(callback); };
    }
    //#endregion

    public OnDestroy(): void {
        window.removeEventListener('mousemove', this.onScreenMouseMove);
        window.removeEventListener('mousedown', this.onScreenMouseDown);
        window.removeEventListener('mouseup', this.onScreenMouseUp);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);

        this.canvas.removeEventListener('mousemove', this.onCanvasMouseMove);
        this.canvas.removeEventListener('mousedown', this.onCanvasMouseDown);
        this.canvas.removeEventListener('mouseup', this.onCanvasMouseUp);
        this.canvas.removeEventListener('mouseleave', this.onCanvasMouseLeave);

        if (Input.Instance === this) {
            Input.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared Input singleton instance.',
                options: { tags: ['Input', 'NitrateProcessDestroy'] }
            });
        }
    }
}
