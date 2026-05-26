import { TextureFactory } from '../rendering/TextureFactory';

/**
 * Double-buffered GPU texture pairs for each simulation layer.
 *
 * Each pass reads from `current*` and writes to `next*`. Call the corresponding
 * `Swap*` method after each pass to advance the buffer for the next frame.
 */
export class PingPongTargets {
    public readonly width: number;
    public readonly height: number;
    
    public currentIdentity: GPUTexture;
    public nextIdentity: GPUTexture;
    public currentPhysics: GPUTexture;
    public nextPhysics: GPUTexture;
    public currentState: GPUTexture;
    public nextState: GPUTexture;

    constructor(
        device: GPUDevice,
        width: number,
        height: number
    ) {
        this.width = width;
        this.height = height;

        this.currentIdentity = TextureFactory.Create2D(device, width, height, 'rgba8unorm');
        this.nextIdentity = TextureFactory.Create2D(device, width, height, 'rgba8unorm');
        this.currentPhysics = TextureFactory.Create2D(device, width, height, 'rgba32float');
        this.nextPhysics = TextureFactory.Create2D(device, width, height, 'rgba32float');
        this.currentState = TextureFactory.Create2D(device, width, height, 'rgba32float');
        this.nextState = TextureFactory.Create2D(device, width, height, 'rgba32float');
    }

    /**
     * Swaps the identity texture pair.
     * Type: rgba8unorm
     * R: MaterialID
     * G: Color
     * B: Variant
     * A: Occupancy
     */
    // @omitfromdocs
    public SwapIdentity(): void {
        const temp = this.currentIdentity;
        this.currentIdentity = this.nextIdentity;
        this.nextIdentity = temp;
    }

    /**
     * Swaps the physics texture pair.
     * Type: rgba32float
     * R: Temperature // The temperature of the pixel
     * G: Pressure // The pressure of the pixel
     * B: VelocityX // How fast this pixel is moving left/right
     * A: VelocityY // How fast this pixel is moving up/down
     */
    // @omitfromdocs
    public SwapPhysics(): void {
        const temp = this.currentPhysics;
        this.currentPhysics = this.nextPhysics;
        this.nextPhysics = temp;
    }

    /**
     * Swaps the state texture pair.
     * Type: rgba32float
     * R: Health // How much remaining health this pixel has
     * G: Lifetime // How much longer this pixel will live (0.0 instantiated pixels have no life)
     * B: [Unused]
     * A: [Unused]
     */
    // @omitfromdocs
    public SwapState(): void {
        const temp = this.currentState;
        this.currentState = this.nextState;
        this.nextState = temp;
    }

    public OnDestroy(): void {
        this.currentIdentity.destroy();
        this.nextIdentity.destroy();
        this.currentPhysics.destroy();
        this.nextPhysics.destroy();
        this.currentState.destroy();
        this.nextState.destroy();
    }
}
