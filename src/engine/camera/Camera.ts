import type { Vec2 } from '../definitions/Primitives';

import { Input } from '../input/Input';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';

/**
 * Tracks the camera's world-space scroll offset and maps world positions to screen space.
 * Panning is rate-limited per frame to prevent the sim window from shifting faster than chunks can load.
 */
export class Camera extends NitrateProcess {
    public static Instance: Camera | null = null;

    private pos: Vec2 = { x: 0, y: 0 };
    /** Returns the camera's current world-space scroll offset in pixels. Positive x is right; positive y is up. */
    public GetCameraPos(): Vec2 { return this.pos; }

    private lastMousePos: Vec2 = { x: 0, y: 0 };

    private wasMiddleDown: boolean = false;

    // 'Debouncer' to dissalow camera movement that is faster than chunk loading
    private static readonly maxPanPerFrame = 200;

    constructor() {
        super();

        Camera.Instance = this;
    }

    public Start(): void {
        LogManager.Instance?.Log({
            text: 'Camera start.',
            options: { tags: ["Camera", "NitrateProcessInit"] }
        });
    }

    public Update(now: number): void {
        const state = Input.Instance?.GetState();
        if (!state) { return; }

        if (state.middleDown) {
            if (this.wasMiddleDown) {
                const max = Camera.maxPanPerFrame;
                const rawDx = state.pos.x - this.lastMousePos.x;
                const rawDy = state.pos.y - this.lastMousePos.y;
                const dx = Math.max(-max, Math.min(max, rawDx));
                const dy = Math.max(-max, Math.min(max, rawDy));
                this.Pan(-dx, dy);
                LogManager.Instance?.Log({
                    text: `Pan dx:${dx.toFixed(2)} dy:${dy.toFixed(2)} → world(${this.pos.x.toFixed(2)}, ${this.pos.y.toFixed(2)})`,
                    options: { tags: ["Camera"], noisy: true }
                });
            }
            this.lastMousePos.x = state.pos.x;
            this.lastMousePos.y = state.pos.y;
        }

        this.wasMiddleDown = state.middleDown;
    }

    /** Moves the camera by delta in world space. Positive x pans right; positive y pans up. */
    public Pan(dx: number, dy: number): void {
        this.pos.x += dx;
        this.pos.y += dy;
    }
    
    /** Converts a world-space position to canvas pixel coordinates relative to the camera's current offset. */
    public WorldToScreen(worldPos: Vec2, canvas: HTMLCanvasElement): Vec2 {
        return {
            x: worldPos.x - this.pos.x + canvas.width / 2,
            y: worldPos.y - this.pos.y + canvas.height / 2,
        };
    }

    public OnResize(): void {
        LogManager.Instance?.Log({
            text: 'Camera OnResize.',
            options: { tags: ['Camera'] }
        });
    }

    public OnDestroy(): void {
        if (Camera.Instance === this) {
            Camera.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared Camera singleton instance.',
                options: { tags: ["Camera", "NitrateProcessDestroy"] }
            });
        }
    }
}
