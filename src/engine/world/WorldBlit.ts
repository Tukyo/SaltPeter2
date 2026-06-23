import type { GameObjectLayer } from '../game_object/GameObjectLayer';
import type { SimulationLayer } from '../simulation/SimulationLayer';
import type { Size2D, Vec2 } from '../definitions/Primitives';

import { LogManager } from '../debug/LogManager';
import { TextureFactory } from '../rendering/TextureFactory';

interface BlitLayerParams {
    encoder: GPUCommandEncoder,
    sourceTexture: GPUTexture,
    scratchTexture: GPUTexture,
    sourcePos: Vec2;
    destinationPos: Vec2;
    size: Size2D;
}

/**
 * GPU blit utility — shifts sim texture layers by one chunk and clears the vacated strip.
 * Owns the scratch textures required to avoid read-write aliasing during copies.
 */
export class WorldBlit {
    private scratchIdentity: GPUTexture | null = null;
    private scratchFloat: GPUTexture | null = null;
    private scratchOwnership: GPUTexture | null = null;

    /** Returns true once scratch textures have been allocated. @internal */
    public IsReady(): boolean { return this.scratchIdentity !== null && this.scratchOwnership !== null; }

    /** Allocates scratch textures sized to the ping-pong targets. Must be called before Blit. @internal */
    public Allocate(device: GPUDevice, simulationLayer: SimulationLayer): void {
        const { width, height } = simulationLayer;
        this.scratchIdentity = TextureFactory.Create2D(device, width, height, 'rgba8unorm');
        this.scratchFloat = TextureFactory.Create2D(device, width, height, 'rgba32float');
        this.scratchOwnership = TextureFactory.Create2D(device, width, height, 'r32uint');
        LogManager.Instance?.Log({
            text: 'Blit allocated.',
            options: { tags: ['World'] }
        });
    }

    /** Copies all simulation layers by delta cells then clears the vacated strip. @internal */
    public Blit(
        device: GPUDevice,
        simulationLayer: SimulationLayer,
        gameObjectLayer: GameObjectLayer,
        delta: Vec2
    ): void {
        if (!this.scratchIdentity || !this.scratchFloat || !this.scratchOwnership) { return; }
        const { width, height } = simulationLayer;
        const absDx = Math.abs(delta.x);
        const absDy = Math.abs(delta.y);
        const srcX = delta.x > 0 ? delta.x : 0;
        const srcY = delta.y > 0 ? delta.y : 0;
        const dstX = delta.x < 0 ? -delta.x : 0;
        const dstY = delta.y < 0 ? -delta.y : 0;
        const blitW = width - absDx;
        const blitH = height - absDy;

        const encoder = device.createCommandEncoder();
        const sourcePos = { x: srcX, y: srcY };
        const destinationPos = { x: dstX, y: dstY };
        const size = { width: blitW, height: blitH };

        this.BlitLayer({ encoder, sourceTexture: simulationLayer.currentIdentity, scratchTexture: this.scratchIdentity, sourcePos, destinationPos, size });
        this.BlitLayer({ encoder, sourceTexture: simulationLayer.currentPhysics, scratchTexture: this.scratchFloat, sourcePos, destinationPos, size });
        this.BlitLayer({ encoder, sourceTexture: simulationLayer.currentState, scratchTexture: this.scratchFloat, sourcePos, destinationPos, size });
        this.BlitLayer({ encoder, sourceTexture: gameObjectLayer.currentIdentity, scratchTexture: this.scratchIdentity, sourcePos, destinationPos, size });
        this.BlitLayer({ encoder, sourceTexture: gameObjectLayer.currentOwnership, scratchTexture: this.scratchOwnership, sourcePos, destinationPos, size });
        this.BlitLayer({ encoder, sourceTexture: gameObjectLayer.currentPhysics, scratchTexture: this.scratchFloat, sourcePos, destinationPos, size });
        this.BlitLayer({ encoder, sourceTexture: gameObjectLayer.currentState, scratchTexture: this.scratchFloat, sourcePos, destinationPos, size });
        
        device.queue.submit([encoder.finish()]);
        this.ClearStrip(device, simulationLayer, gameObjectLayer, delta);
    }

    /** Copies one texture layer through a scratch buffer to avoid GPU read-write aliasing. @internal */
    private BlitLayer(params: BlitLayerParams): void {
        const { encoder, sourceTexture, scratchTexture, sourcePos, destinationPos, size } = params;
        encoder.copyTextureToTexture(
            { texture: sourceTexture, origin: [sourcePos.x, sourcePos.y] },
            { texture: scratchTexture, origin: [destinationPos.x, destinationPos.y] },
            [size.width, size.height]
        );
        encoder.copyTextureToTexture(
            { texture: scratchTexture, origin: [destinationPos.x, destinationPos.y] },
            { texture: sourceTexture, origin: [destinationPos.x, destinationPos.y] },
            [size.width, size.height]
        );
        LogManager.Instance?.Log({
            text: `BlitLayer (${size.width}x${size.height}) src=(${sourcePos.x},${sourcePos.y}) dst=(${destinationPos.x},${destinationPos.y}).`,
            options: { tags: ['World'], noisy: true }
        });
    }

    /** Zeroes the strip exposed after a blit so stale data does not linger. @internal */
    private ClearStrip(
        device: GPUDevice,
        simulationLayer: SimulationLayer,
        gameObjectLayer: GameObjectLayer,
        delta: Vec2
    ): void {
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
        device.queue.writeTexture({ texture: gameObjectLayer.currentIdentity, origin }, identityZeros, { bytesPerRow: strip.width * 4 }, extent);
        device.queue.writeTexture({ texture: gameObjectLayer.currentOwnership, origin }, identityZeros, { bytesPerRow: strip.width * 4 }, extent);
        device.queue.writeTexture({ texture: gameObjectLayer.currentPhysics, origin }, floatZeros, { bytesPerRow: strip.width * 16 }, extent);
        device.queue.writeTexture({ texture: gameObjectLayer.currentState, origin }, floatZeros, { bytesPerRow: strip.width * 16 }, extent);

        LogManager.Instance?.Log({
            text: `ClearStrip (${strip.width}x${strip.height}) at (${origin.x},${origin.y}).`,
            options: { tags: ['World'], noisy: true }
        });
    }

    /** Destroys scratch textures and marks the blit unready. Call on resize or destroy. @internal */
    public Reset(): void {
        this.scratchIdentity?.destroy();
        this.scratchFloat?.destroy();
        this.scratchOwnership?.destroy();

        this.scratchIdentity = null;
        this.scratchFloat = null;
        this.scratchOwnership = null;

        LogManager.Instance?.Log({
            text: 'WorldBlit reset.',
            options: { tags: ['World'] }
        });
    }
}
