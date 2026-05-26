import type { Vec2 } from '../definitions/Primitives';

import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { Utils } from '../utility/Utils';

export interface InputState {
    pos: Vec2;
    leftDown: boolean;
    middleDown: boolean;
    rightDown: boolean;
    isInside: boolean;
}

/**
 * Tracks mouse input relative to the simulation canvas.
 * 
 * ```ts
 * new Nitrate.Input(canvas);
 * ```
 */
export class Input extends NitrateProcess {
    public static Instance: Input | null = null;

    private readonly canvas: HTMLCanvasElement;
    private readonly onMouseUp: (e: MouseEvent) => void;

    private mouse: InputState;
    /** Returns a snapshot of the current mouse state. */
    public GetState(): InputState { return { ...this.mouse }; }

    constructor(canvas: HTMLCanvasElement) {
        super();

        Input.Instance = this;
        this.canvas = canvas;

        // Set the default input state
        this.mouse = {
            pos: { x: 0, y: 0 },
            leftDown: false,
            middleDown: false,
            rightDown: false,
            isInside: false
        };

        canvas.addEventListener('mousemove', e => {
            this.UpdateMousePosition(e);
            this.mouse.isInside = true;

            LogManager.Instance?.Log({
                text: 'Mouse moved over canvas.',
                options: {
                    noisy: true,
                    tags: ["Input", "Mouse"],
                    data: this.mouse.pos
                }
            });
        });

        canvas.addEventListener('mousedown', e => {
            this.UpdateMousePosition(e);
            this.mouse.isInside = true;
            if (e.button === 0) {
                this.mouse.leftDown = true;
                LogManager.Instance?.Log({
                    text: 'Left mouse button pressed.',
                    options: {
                        noisy: true,
                        tags: ["Input", "Mouse"],
                        data: this.mouse
                    }
                });
            }
            if (e.button === 1) {
                e.preventDefault();
                this.mouse.middleDown = true;
                LogManager.Instance?.Log({
                    text: 'Middle mouse button pressed.',
                    options: {
                        noisy: true,
                        tags: ["Input", "Mouse"],
                        data: this.mouse
                    }
                });
            }
            if (e.button === 2) {
                this.mouse.rightDown = true;
                LogManager.Instance?.Log({
                    text: 'Right mouse button pressed.',
                    options: {
                        noisy: true,
                        tags: ["Input", "Mouse"],
                        data: this.mouse
                    }
                });
            }
        });

        this.onMouseUp = (e: MouseEvent) => {
            if (e.button === 0) {
                this.mouse.leftDown = false;

                LogManager.Instance?.Log({
                    text: 'Left mouse button released.',
                    options: {
                        noisy: true,
                        tags: ["Input", "Mouse"],
                        data: this.mouse
                    }
                });
            }

            if (e.button === 1) {
                this.mouse.middleDown = false;

                LogManager.Instance?.Log({
                    text: 'Middle mouse button released.',
                    options: {
                        noisy: true,
                        tags: ["Input", "Mouse"],
                        data: this.mouse
                    }
                });
            }

            if (e.button === 2) {
                this.mouse.rightDown = false;

                LogManager.Instance?.Log({
                    text: 'Right mouse button released.',
                    options: {
                        noisy: true,
                        tags: ["Input", "Mouse"],
                        data: this.mouse
                    }
                });
            }
        };
        window.addEventListener('mouseup', this.onMouseUp);

        canvas.addEventListener('mouseleave', () => {
            this.mouse.leftDown = false;
            this.mouse.isInside = false;

            LogManager.Instance?.Log({
                text: 'Mouse left canvas bounds.',
                options: {
                    noisy: true,
                    tags: ["Input", "Mouse"],
                    data: this.mouse
                }
            });
        });
    }

    public Start(): void {
        LogManager.Instance?.Log({
            text: 'Input start.',
            options: { tags: ["Input", "NitrateProcessInit"] }
        });
    }

    /** Computes canvas-relative mouse position from a DOM mouse event and flips Y to sim-space. */
    private UpdateMousePosition(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const normalizedX = (e.clientX - rect.left) / rect.width;
        const normalizedY = (e.clientY - rect.top) / rect.height;

        this.mouse.pos.x = normalizedX * this.canvas.width;
        this.mouse.pos.y = Utils.FlipY(normalizedY * this.canvas.height, this.canvas.height);
    }

    /** Resets all mouse state to defaults. Call on scene transitions to prevent stale input. */
    public Reset(): void {
        this.mouse.pos = { x: 0, y: 0 };
        this.mouse.leftDown = false;
        this.mouse.middleDown = false;
        this.mouse.rightDown = false;
        this.mouse.isInside = false;
    }

    public OnDestroy(): void {
        window.removeEventListener('mouseup', this.onMouseUp);
        if (Input.Instance === this) {
            Input.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared Input singleton instance.',
                options: { tags: ["Input", "NitrateProcessDestroy"] }
            });
        }
    }
}
