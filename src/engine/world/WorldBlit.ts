import type { SimulationLayer } from '../simulation/SimulationLayer';
import type { Size2D, Vec2 } from '../definitions/Primitives';

import { LogManager } from '../debug/LogManager';
import { TextureFactory } from '../rendering/TextureFactory';

/**
 * GPU blit utility — shifts sim texture layers by one chunk and clears the vacated strip.
 * Owns the scratch textures required to avoid read-write aliasing during copies.
 */
export class WorldBlit {
    private scratchIdentity: GPUTexture | null = null;
    private scratchFloat: GPUTexture | null = null;

    /** Returns true once scratch textures have been allocated. @internal */
    public IsReady(): boolean { return this.scratchIdentity !== null; }

    /** Allocates scratch textures sized to the ping-pong targets. Must be called before Blit. @internal */
    public Allocate(device: GPUDevice, simulationLayer: SimulationLayer): void {
        const { width, height } = simulationLayer;
        this.scratchIdentity = TextureFactory.Create2D(device, width, height, 'rgba8unorm');
        this.scratchFloat = TextureFactory.Create2D(device, width, height, 'rgba32float');
        LogManager.Instance?.Log({
            text: 'Blit allocated.',
            options: { tags: ['World'] }
        });
    }

    /** Copies all sim layers by delta cells then clears the vacated strip. One axis per call. @internal */
    public Blit(device: GPUDevice, simulationLayer: SimulationLayer, delta: Vec2): void {
        if (!this.scratchIdentity || !this.scratchFloat) { return; }
        const { width, height } = simulationLayer;
        const absDx = Math.abs(delta.x);
        const absDy = Math.abs(delta.y);
        const srcX = delta.x > 0 ? delta.x : 0;
        const srcY = delta.y > 0 ? delta.y : 0;
        const dstX = delta.x < 0 ? -delta.x : 0;
        const dstY = delta.y < 0 ? -delta.y : 0;
        const blitW = width - absDx;
        const blitH = height - absDy;

        const enc = device.createCommandEncoder();
        this.BlitLayer(enc, simulationLayer.currentIdentity, this.scratchIdentity, srcX, srcY, dstX, dstY, blitW, blitH);
        this.BlitLayer(enc, simulationLayer.currentPhysics, this.scratchFloat, srcX, srcY, dstX, dstY, blitW, blitH);
        this.BlitLayer(enc, simulationLayer.currentState, this.scratchFloat, srcX, srcY, dstX, dstY, blitW, blitH);
        device.queue.submit([enc.finish()]);

        this.ClearStrip(device, simulationLayer, delta);
    }

    /** Copies one texture layer through a scratch buffer to avoid GPU read-write aliasing. @internal */
    private BlitLayer(
        enc: GPUCommandEncoder,
        src: GPUTexture, scratch: GPUTexture,
        srcX: number, srcY: number,
        dstX: number, dstY: number,
        w: number, h: number
    ): void {
        enc.copyTextureToTexture({ texture: src, origin: [srcX, srcY] }, { texture: scratch, origin: [dstX, dstY] }, [w, h]);
        enc.copyTextureToTexture({ texture: scratch, origin: [dstX, dstY] }, { texture: src, origin: [dstX, dstY] }, [w, h]);
        LogManager.Instance?.Log({
            text: `BlitLayer (${w}x${h}) src=(${srcX},${srcY}) dst=(${dstX},${dstY}).`,
            options: { tags: ['World'], noisy: true }
        });
    }

    /** Zeroes the strip exposed after a blit so stale data does not linger. @internal */
    private ClearStrip(device: GPUDevice, simulationLayer: SimulationLayer, delta: Vec2): void {
        const { width, height } = simulationLayer;
        const absDx = Math.abs(delta.x);
        const absDy = Math.abs(delta.y);
        const origin: Vec2 = { x: delta.x > 0 ? width - absDx : 0, y: delta.y > 0 ? height - absDy : 0 };
        const strip: Size2D = { width: absDx > 0 ? absDx : width, height: absDy > 0 ? absDy : height };
        const extent: GPUExtent3DStrict = [strip.width, strip.height];

        const identityZeros = new Uint8Array(strip.width * strip.height * 4);
        const floatZeros = new Uint8Array(strip.width * strip.height * 16);
        device.queue.writeTexture({ texture: simulationLayer.currentIdentity, origin }, identityZeros, { bytesPerRow: strip.width * 4 }, extent);
        device.queue.writeTexture({ texture: simulationLayer.currentPhysics, origin }, floatZeros, { bytesPerRow: strip.width * 16 }, extent);
        device.queue.writeTexture({ texture: simulationLayer.currentState, origin }, floatZeros, { bytesPerRow: strip.width * 16 }, extent);
        LogManager.Instance?.Log({
            text: `ClearStrip (${strip.width}x${strip.height}) at (${origin.x},${origin.y}).`,
            options: { tags: ['World'], noisy: true }
        });
    }

    /** Destroys scratch textures and marks the blit unready. Call on resize or destroy. @internal */
    public Reset(): void {
        this.scratchIdentity?.destroy();
        this.scratchFloat?.destroy();

        this.scratchIdentity = null;
        this.scratchFloat = null;

        LogManager.Instance?.Log({
            text: 'WorldBlit reset.',
            options: { tags: ['World'] }
        });
    }
}
