import type { Size2D } from "../definitions/Primitives";

export interface Renderer2DParams {
    containerId: string;
    canvasId: string;
    size: Size2D;
    style?: Partial<CSSStyleDeclaration>;
}

/**
 * A 2D canvas renderer. Creates and owns an `HTMLCanvasElement` inside a given container.
 *
 * Created via {@link Renderer.Create2D} — do not instantiate directly.
 */
export class Renderer2D {
    public readonly canvas: HTMLCanvasElement;

    private constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    /** Creates a canvas element inside the specified container and returns the renderer. */
    public static Create(params: Renderer2DParams): Renderer2D {
        const container = document.getElementById(params.containerId);
        if (!container) { throw new Error('Renderer2D: no container found with id ' + params.containerId); }

        const canvas = document.createElement('canvas');
        canvas.id = params.canvasId;
        canvas.width = params.size.width;
        canvas.height = params.size.height;
        if (params.style) { Object.assign(canvas.style, params.style); }
        container.appendChild(canvas);

        return new Renderer2D(canvas);
    }

    /** Resizes the canvas to the given dimensions. */
    public Resize(size: Size2D): void {
        this.canvas.width = size.width;
        this.canvas.height = size.height;
    }

    /** Removes the canvas from the DOM. Use {@link Renderer.Destroy2D} instead. @internal  */
    public Destroy(): void {
        this.canvas.remove();
    }
}
