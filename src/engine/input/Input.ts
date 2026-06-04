import type { Vec2 } from '../definitions/Primitives';

import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { Utils } from '../utility/Utils';

export interface MouseState {
    pos: Vec2;
    leftDown: boolean;
    middleDown: boolean;
    rightDown: boolean;
    isInside: boolean;
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
    private onBlur: () => void = () => {};

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
    private mouse: MouseState = { pos: { x: 0, y: 0 }, leftDown: false, middleDown: false, rightDown: false, isInside: false };
    private onMouseMove: (e: MouseEvent) => void = () => {};
    private onMouseDown: (e: MouseEvent) => void = () => {};
    private onMouseUp: (e: MouseEvent) => void = () => {};
    private onMouseLeave: () => void = () => {};
    private readonly mouseDownCallbacks: Map<MouseButton, Set<(e: MouseEvent) => void>> = new Map();
    private readonly mouseUpCallbacks: Map<MouseButton, Set<(e: MouseEvent) => void>> = new Map();
    private readonly mouseMoveCallbacks: Set<(e: MouseEvent) => void> = new Set();

    private InitMouse(canvas: HTMLCanvasElement): void {
        this.onMouseMove = (e: MouseEvent) => {
            this.UpdateMousePosition(e);
            this.mouse.isInside = true;
            this.mouseMoveCallbacks.forEach(cb => cb(e));
            LogManager.Instance?.Log({
                text: 'Mouse moved over canvas.',
                options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse.pos }
            });
        };

        this.onMouseDown = (e: MouseEvent) => {
            this.UpdateMousePosition(e);
            this.mouse.isInside = true;
            if (e.button === 0) {
                this.mouse.leftDown = true;
                LogManager.Instance?.Log({
                    text: 'Left mouse button pressed.',
                    options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse }
                });
            }
            if (e.button === 1) {
                e.preventDefault();
                this.mouse.middleDown = true;
                LogManager.Instance?.Log({
                    text: 'Middle mouse button pressed.',
                    options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse }
                });
            }
            if (e.button === 2) {
                this.mouse.rightDown = true;
                LogManager.Instance?.Log({
                    text: 'Right mouse button pressed.',
                    options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse }
                });
            }
            this.mouseDownCallbacks.get(e.button as MouseButton)?.forEach(cb => cb(e));
        };

        this.onMouseUp = (e: MouseEvent) => {
            if (e.button === 0) {
                this.mouse.leftDown = false;
                LogManager.Instance?.Log({
                    text: 'Left mouse button released.',
                    options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse }
                });
            }
            if (e.button === 1) {
                this.mouse.middleDown = false;
                LogManager.Instance?.Log({
                    text: 'Middle mouse button released.',
                    options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse }
                });
            }
            if (e.button === 2) {
                this.mouse.rightDown = false;
                LogManager.Instance?.Log({
                    text: 'Right mouse button released.',
                    options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse }
                });
            }
            this.mouseUpCallbacks.get(e.button as MouseButton)?.forEach(cb => cb(e));
        };

        this.onMouseLeave = () => {
            this.mouse.leftDown = false;
            this.mouse.isInside = false;
            LogManager.Instance?.Log({
                text: 'Mouse left canvas bounds.',
                options: { noisy: true, tags: ['Input', 'Mouse'], data: this.mouse }
            });
        };

        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('mousedown', this.onMouseDown);
        canvas.addEventListener('mouseleave', this.onMouseLeave);
        window.addEventListener('mouseup', this.onMouseUp);
    }

    /** Returns a snapshot of the current mouse state. */
    public GetMouseState(): MouseState { return { ...this.mouse }; }

    /** Subscribes to mousedown on the canvas for a specific button. Returns an unsubscribe function. */
    public OnMouseDown(button: MouseButton, callback: (e: MouseEvent) => void): () => void {
        if (!this.mouseDownCallbacks.has(button)) { this.mouseDownCallbacks.set(button, new Set()); }
        const set = this.mouseDownCallbacks.get(button);
        if (set) { set.add(callback); }
        return () => { this.mouseDownCallbacks.get(button)?.delete(callback); };
    }

    /** Subscribes to mouseup (window-level, catches drag-releases). Returns an unsubscribe function. */
    public OnMouseUp(button: MouseButton, callback: (e: MouseEvent) => void): () => void {
        if (!this.mouseUpCallbacks.has(button)) { this.mouseUpCallbacks.set(button, new Set()); }
        const set = this.mouseUpCallbacks.get(button);
        if (set) { set.add(callback); }
        return () => { this.mouseUpCallbacks.get(button)?.delete(callback); };
    }

    /** Subscribes to mousemove on the canvas. Returns an unsubscribe function. */
    public OnMouseMove(callback: (e: MouseEvent) => void): () => void {
        this.mouseMoveCallbacks.add(callback);
        return () => { this.mouseMoveCallbacks.delete(callback); };
    }

    /** Resets all mouse state to defaults. Call on scene transitions to prevent stale input. */
    public ResetMouseState(): void {
        this.mouse.pos = { x: 0, y: 0 };
        this.mouse.leftDown = false;
        this.mouse.middleDown = false;
        this.mouse.rightDown = false;
        this.mouse.isInside = false;
    }

    /** Computes canvas-relative mouse position from a DOM mouse event and flips Y to sim-space. */
    private UpdateMousePosition(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const normalizedX = (e.clientX - rect.left) / rect.width;
        const normalizedY = (e.clientY - rect.top) / rect.height;
        this.mouse.pos.x = normalizedX * this.canvas.width;
        this.mouse.pos.y = Utils.FlipY(normalizedY * this.canvas.height, this.canvas.height);
    }
    //#endregion

    //#region KEYBOARD
    private onKeyDown: (e: KeyboardEvent) => void = () => {};
    private onKeyUp: (e: KeyboardEvent) => void = () => {};
    private readonly keysDown: Set<string> = new Set();
    private readonly keyDownCallbacks: Map<string, Set<() => void>> = new Map();
    private readonly keyUpCallbacks: Map<string, Set<() => void>> = new Map();

    private InitKeyboard(): void {
        this.onKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).closest('input, textarea')) { return; }
            if (this.keysDown.has(e.key)) { return; }
            this.keysDown.add(e.key);
            this.keyDownCallbacks.get(e.key)?.forEach(cb => cb());
        };

        this.onKeyUp = (e: KeyboardEvent) => {
            if (!this.keysDown.has(e.key)) { return; }
            this.keysDown.delete(e.key);
            this.keyUpCallbacks.get(e.key)?.forEach(cb => cb());
        };

        this.onBlur = () => {
            for (const key of this.keysDown) {
                this.keyUpCallbacks.get(key)?.forEach(cb => cb());
            }
            this.keysDown.clear();
            this.ResetMouseState();
        };

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
    }

    /** Returns true while the given key is held. */
    public IsKeyDown(key: string): boolean { return this.keysDown.has(key); }

    /** Subscribes to the first keydown for a key (repeat events ignored). Returns an unsubscribe function. */
    public OnKeyDown(key: string, callback: () => void): () => void {
        if (!this.keyDownCallbacks.has(key)) { this.keyDownCallbacks.set(key, new Set()); }
        const set = this.keyDownCallbacks.get(key);
        if (set) { set.add(callback); }
        return () => { this.keyDownCallbacks.get(key)?.delete(callback); };
    }

    /** Subscribes to keyup for a key. Returns an unsubscribe function. */
    public OnKeyUp(key: string, callback: () => void): () => void {
        if (!this.keyUpCallbacks.has(key)) { this.keyUpCallbacks.set(key, new Set()); }
        const set = this.keyUpCallbacks.get(key);
        if (set) { set.add(callback); }
        return () => { this.keyUpCallbacks.get(key)?.delete(callback); };
    }
    //#endregion

    public OnDestroy(): void {
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);

        if (Input.Instance === this) {
            Input.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared Input singleton instance.',
                options: { tags: ['Input', 'NitrateProcessDestroy'] }
            });
        }
    }
}
