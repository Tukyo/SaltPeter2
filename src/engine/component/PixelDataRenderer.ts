import type { PixelCell } from './definitions/pixeldata/PixelData';
import type { Renderer2DParams } from '../rendering/Renderer2D';
import type { Size2D } from '../definitions/Primitives';

import { MaterialQuery } from '../materials/MaterialQuery';
import { Renderer } from '../rendering/Renderer';
import { Renderer2D } from '../rendering/Renderer2D';

/**
 * Renders a flat array of {@link PixelCell} data onto a 2D canvas using material color lookups.
 */
export class PixelDataRenderer {
    private readonly renderer: Renderer2D;

    constructor(params: Renderer2DParams) {
        this.renderer = Renderer.Create2D(params);
    }

    /**
     * Draws a pixel cell array onto the canvas. Resizes the canvas to fit `size * scale` before rendering.
     * @internal
     */
    public Render(cells: PixelCell[], size: Size2D, scale: number): void {
        this.renderer.Resize({ width: size.width * scale, height: size.height * scale });

        const ctx = this.renderer.canvas.getContext('2d');
        if (!ctx) { return; }

        ctx.clearRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);

        for (const cell of cells) {
            const material = MaterialQuery.GetById(cell.materialId);
            if (!material) { continue; }

            const variantId = cell.variantId ?? 0;
            const variantColors = variantId > 0 ? material.variants?.find(v => v.id === variantId)?.colors : undefined;
            const color = (variantColors ?? material.colors)[cell.colorVariant] ?? material.colors[0];
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

            const canvasX = cell.pos.x * scale;
            const canvasY = cell.pos.y * scale;
            ctx.fillRect(canvasX, canvasY, scale, scale);
        }
    }

    public get canvas(): HTMLCanvasElement { return this.renderer.canvas; }

    // @omitfromdocs
    public Destroy(): void {
        Renderer.Destroy2D(this.renderer);
    }
}
