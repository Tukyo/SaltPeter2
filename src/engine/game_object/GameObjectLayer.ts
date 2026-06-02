import { TextureFactory } from "../rendering/TextureFactory";

/**
 * Double-buffered GPU texture pairs for the GameObject layer.
 *
 * Works exactly the same as the SimulationLayer, but targeted for GameObjects.
 */
export class GameObjectLayer {
    public readonly width: number;
    public readonly height: number;

    public currentIdentity: GPUTexture;
    public nextIdentity: GPUTexture;
    public currentPhysics: GPUTexture;
    public nextPhysics: GPUTexture;
    public currentState: GPUTexture;
    public nextState: GPUTexture;
    public currentOwnership: GPUTexture;
    public nextOwnership: GPUTexture;

    private readonly zeroBuffer: GPUBuffer;
    private readonly zeroBytesPerRow: number;

    constructor(device: GPUDevice, width: number, height: number) {
        this.width = width;
        this.height = height;

        this.currentIdentity  = TextureFactory.Create2D(device, width, height, 'rgba8unorm');
        this.nextIdentity     = TextureFactory.Create2D(device, width, height, 'rgba8unorm');
        this.currentPhysics   = TextureFactory.Create2D(device, width, height, 'rgba32float');
        this.nextPhysics      = TextureFactory.Create2D(device, width, height, 'rgba32float');
        this.currentState     = TextureFactory.Create2D(device, width, height, 'rgba32float');
        this.nextState        = TextureFactory.Create2D(device, width, height, 'rgba32float');
        this.currentOwnership = TextureFactory.Create2D(device, width, height, 'r32uint');
        this.nextOwnership    = TextureFactory.Create2D(device, width, height, 'r32uint');

        // bytesPerRow must be a multiple of 256 for copyBufferToTexture.
        // Both identity (rgba8unorm) and ownership (r32uint) are 4 bytes/pixel so one buffer covers both.
        this.zeroBytesPerRow = Math.ceil(width * 4 / 256) * 256;
        this.zeroBuffer = device.createBuffer({
            size: this.zeroBytesPerRow * height,
            usage: GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true,
        });
        new Uint8Array(this.zeroBuffer.getMappedRange()).fill(0);
        this.zeroBuffer.unmap();
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
     * R: Temperature // The temperature of each pixel in the GameObject
     * G: Pressure // The pressure of each pixel in the GameObject
     * B: [Unused]
     * A: [Unused]
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
     * R: Health // How much remaining health each pixel in the GameObject has
     * G: Lifetime // How much longer each pixel will live (0.0 instantiated pixels have no life)
     * B: [Unused]
     * A: [Unused]
     */
    // @omitfromdocs
    public SwapState(): void {
        const temp = this.currentState;
        this.currentState = this.nextState;
        this.nextState = temp;
    }

    /**
     * Swaps the ownership texture pair.
     * Allows simulation subsystems to claim a cell.
     * Type: r32uint
     * R: GameObjectId (0 = unowned)
     */
    // @omitfromdocs
    public SwapOwnership(): void {
        const temp = this.currentOwnership;
        this.currentOwnership = this.nextOwnership;
        this.nextOwnership = temp;
    }

    /**
     * Zeroes `nextIdentity` and `nextOwnership` via a pre-mapped GPU buffer copy.
     * Must be called at the start of the erase pass each step so stale ownership
     * and identity data from the previous frame do not bleed into the new stamp.
     * @internal
     */
    public ClearNextTextures(encoder: GPUCommandEncoder): void {
        const size = { width: this.width, height: this.height };
        encoder.copyBufferToTexture(
            { buffer: this.zeroBuffer, bytesPerRow: this.zeroBytesPerRow },
            { texture: this.nextIdentity },
            size
        );
        encoder.copyBufferToTexture(
            { buffer: this.zeroBuffer, bytesPerRow: this.zeroBytesPerRow },
            { texture: this.nextOwnership },
            size
        );
    }

    public OnDestroy(): void {
        this.currentIdentity.destroy();
        this.nextIdentity.destroy();
        this.currentPhysics.destroy();
        this.nextPhysics.destroy();
        this.currentState.destroy();
        this.nextState.destroy();
        this.currentOwnership.destroy();
        this.nextOwnership.destroy();
        this.zeroBuffer.destroy();
    }
}
