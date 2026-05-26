import type { ChunkEntry } from './chunk/ChunkData';
import type { PingPongTargets } from '../simulation/PingPongTargets';
import type { Size2D, Vec2 } from '../definitions/Primitives';

import { Camera } from '../camera/Camera';
import { ChunkData } from './chunk/ChunkData';
import { ChunkManager } from './chunk/ChunkManager';
import { DataPersistenceManager } from '../data_persistence/DataPersistenceManager';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { Renderer } from '../rendering/Renderer';
import { SimulationManager } from '../simulation/SimulationManager';
import { WorldBlit } from './WorldBlit';
import { WorldConfig } from '../config/WorldConfig';
import { Utils } from '../utility/Utils';

export interface WorldMetadata {
    seed: number;
}

interface HorizontalShiftParams {
    device: GPUDevice;
    pingPong: PingPongTargets;
    cam: Camera;
    chunkSize: number;
    contentWidth: number;
    canvasWidth: number;
    offsetCellsX: number;
}

interface VerticalShiftParams {
    device: GPUDevice;
    pingPong: PingPongTargets;
    cam: Camera;
    chunkSize: number;
    contentHeight: number;
    canvasHeight: number;
    offsetCellsY: number;
}

interface StripReadbackParams {
    device: GPUDevice;
    pingPong: PingPongTargets;
    delta: Vec2;
    capturedOrigin: Vec2;
}

interface ReadbackBuffers {
    identityBuffer: GPUBuffer;
    physicsBuffer: GPUBuffer;
    stateBuffer: GPUBuffer;
    identityBPR: number;
    floatBPR: number;
}

interface StripBufferParams {
    buffers: ReadbackBuffers;
    readOrigin: Vec2;
    readSize: Size2D;
    capturedOrigin: Vec2;
}

/** 
 * Central process for the world simulation window.
 * Tracks the sim origin, handles world scrolling, and coordinates chunk lifecycle with ChunkManager.
 */
export class World extends NitrateProcess {
    public static Instance: World | null = null;

    private simOrigin: Vec2 = { x: 0, y: 0 };
    /** Returns the world-space cell coordinate of the simulation texture's top-left corner. */
    public GetSimOrigin(): Vec2 { return this.simOrigin; }

    private seed: number = 0;
    /** Returns the world seed. Loaded from disk on resume, or randomly generated on first run. */
    public GetSeed(): number { return this.seed; }

    private worldReady: Promise<void> = Promise.resolve();
    /** Resolves once the world seed has been loaded or created. Await before using the seed in generation. */
    public IsWorldReady(): Promise<void> { return this.worldReady; }

    private readonly blit = new WorldBlit();

    constructor() {
        super();
        World.Instance = this;
        new ChunkManager();
    }

    public Start(): void {
        LogManager.Instance?.Log({
            text: 'World start.',
            options: { tags: ['World', 'NitrateProcessInit'] }
        });

        const { chunk, generation } = WorldConfig.GetConfig();
        this.simOrigin.x = -(chunk.margin * chunk.size) + generation.spawnOffset.cx * chunk.size;
        this.simOrigin.y = -(chunk.margin * chunk.size) + generation.spawnOffset.cy * chunk.size;
        this.worldReady = this.CreateOrFetchMeta();

        SimulationManager.Instance?.state.SetResolutionScale(0.25);
    }

    public Update(now: number): void {
        const sim = SimulationManager.Instance;
        const cam = Camera.Instance;
        const renderer = Renderer.Instance?.GetWebGPU();
        if (!sim?.pingPong || !cam || !renderer) { return; }

        if (!this.blit.IsReady()) {
            this.blit.Allocate(renderer.device, sim.pingPong);
        }

        const { pingPong } = sim;
        const { canvas } = renderer;
        const chunkSize = ChunkData.GetChunkSize();
        const { chunk } = WorldConfig.GetConfig();
        const margin = chunk.margin * chunk.size;
        const contentWidth = pingPong.width - 2 * margin;
        const contentHeight = pingPong.height - 2 * margin;

        const { x: camX, y: camY } = cam.GetCameraPos();
        const offsetCellsX = camX * contentWidth / canvas.width;
        const offsetCellsY = -camY * contentHeight / canvas.height;

        this.HandleHorizontalShift({
            device: renderer.device,
            pingPong,
            cam,
            chunkSize,
            contentWidth,
            canvasWidth: canvas.width,
            offsetCellsX
        });
        this.HandleVerticalShift({
            device: renderer.device,
            pingPong,
            cam,
            chunkSize,
            contentHeight: contentHeight,
            canvasHeight: canvas.height,
            offsetCellsY
        });
    }

    /** Checks the horizontal camera offset and shifts the sim window left or right by one chunk if the threshold is exceeded. */
    private HandleHorizontalShift(params: HorizontalShiftParams): void {
        const { device, pingPong, cam, chunkSize, contentWidth, canvasWidth, offsetCellsX } = params;
        const simDebounce = WorldConfig.GetConfig().performance.simDebounce;

        if (offsetCellsX > chunkSize) {
            const ox = this.simOrigin.x; const oy = this.simOrigin.y;
            this.simOrigin.x += chunkSize;
            this.BeginStripReadback({
                device,
                pingPong,
                delta: { x: chunkSize, y: 0 },
                capturedOrigin: { x: ox, y: oy }
            });
            this.blit.Blit(device, pingPong, { x: chunkSize, y: 0 });
            ChunkManager.Instance?.UploadEdgeChunks(device, pingPong, { x: chunkSize, y: 0 }, this.simOrigin);
            SimulationManager.Instance?.Debounce(simDebounce);
            cam.Pan(-chunkSize * canvasWidth / contentWidth, 0);
            LogManager.Instance?.Log({
                text: 'World scrolled right — loaded new chunk column.',
                options: { tags: ['World'], noisy: true }
            });
        } else if (offsetCellsX < -chunkSize) {
            const ox = this.simOrigin.x; const oy = this.simOrigin.y;
            this.simOrigin.x -= chunkSize;
            this.BeginStripReadback({
                device,
                pingPong,
                delta: { x: -chunkSize, y: 0 },
                capturedOrigin: { x: ox, y: oy }
            });
            this.blit.Blit(device, pingPong, { x: -chunkSize, y: 0 });
            ChunkManager.Instance?.UploadEdgeChunks(device, pingPong, { x: -chunkSize, y: 0 }, this.simOrigin);
            SimulationManager.Instance?.Debounce(simDebounce);
            cam.Pan(chunkSize * canvasWidth / contentWidth, 0);
            LogManager.Instance?.Log({
                text: 'World scrolled left — loaded new chunk column.',
                options: { tags: ['World'], noisy: true }
            });
        }
    }

    /** Checks the vertical camera offset and shifts the sim window up or down by one chunk if the threshold is exceeded. */
    private HandleVerticalShift(params: VerticalShiftParams): void {
        const { device, pingPong, cam, chunkSize, contentHeight, canvasHeight, offsetCellsY } = params;
        const simDebounce = WorldConfig.GetConfig().performance.simDebounce;

        if (offsetCellsY > chunkSize) {
            const ox = this.simOrigin.x; const oy = this.simOrigin.y;
            this.simOrigin.y += chunkSize;
            this.BeginStripReadback({
                device,
                pingPong,
                delta: { x: 0, y: chunkSize },
                capturedOrigin: { x: ox, y: oy }
            });
            this.blit.Blit(device, pingPong, { x: 0, y: chunkSize });
            ChunkManager.Instance?.UploadEdgeChunks(device, pingPong, { x: 0, y: chunkSize }, this.simOrigin);
            SimulationManager.Instance?.Debounce(simDebounce);
            cam.Pan(0, chunkSize * canvasHeight / contentHeight);
            LogManager.Instance?.Log({
                text: 'World scrolled up — loaded new chunk row.',
                options: { tags: ['World'], noisy: true }
            });
        } else if (offsetCellsY < -chunkSize) {
            const ox = this.simOrigin.x; const oy = this.simOrigin.y;
            this.simOrigin.y -= chunkSize;
            this.BeginStripReadback({
                device,
                pingPong,
                delta: { x: 0, y: -chunkSize },
                capturedOrigin: { x: ox, y: oy }
            });
            this.blit.Blit(device, pingPong, { x: 0, y: -chunkSize });
            ChunkManager.Instance?.UploadEdgeChunks(device, pingPong, { x: 0, y: -chunkSize }, this.simOrigin);
            SimulationManager.Instance?.Debounce(simDebounce);
            cam.Pan(0, -chunkSize * canvasHeight / contentHeight);
            LogManager.Instance?.Log({
                text: 'World scrolled down — loaded new chunk row.',
                options: { tags: ['World'], noisy: true }
            });
        }
    }

    /** Computes the strip region from the delta, calls PrepareReadback, then fires CommitStripReadback. */
    private BeginStripReadback(params: StripReadbackParams): void {
        const { device, pingPong, delta, capturedOrigin } = params;
        const { width, height } = pingPong;
        const absDx = Math.abs(delta.x);
        const absDy = Math.abs(delta.y);
        const readOrigin: Vec2 = { x: delta.x < 0 ? width - absDx : 0, y: delta.y < 0 ? height - absDy : 0 };
        const readSize: Size2D = { width: delta.x !== 0 ? absDx : width, height: delta.y !== 0 ? absDy : height };
        const buffers = this.PrepareReadback(device, pingPong, readOrigin, readSize);
        this.CommitStripReadback({ buffers, readOrigin, readSize, capturedOrigin });
    }

    /** Allocates GPU readback buffers, submits copy commands for the given region, and returns the buffers and row strides. */
    private PrepareReadback(device: GPUDevice, pingPong: PingPongTargets, readOrigin: Vec2, readSize: Size2D): ReadbackBuffers {
        const identityBPR = readSize.width * ChunkData.GetIdentityBytesPerCell();
        const floatBPR = readSize.width * ChunkData.GetPhysicsBytesPerCell();
        const identityBuffer = device.createBuffer({
            size: identityBPR * readSize.height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const physicsBuffer = device.createBuffer({
            size: floatBPR * readSize.height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const stateBuffer = device.createBuffer({
            size: floatBPR * readSize.height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const enc = device.createCommandEncoder();
        enc.copyTextureToBuffer({
            texture: pingPong.currentIdentity,
            origin: [readOrigin.x, readOrigin.y]
        }, { buffer: identityBuffer, bytesPerRow: identityBPR }, [readSize.width, readSize.height]);
        enc.copyTextureToBuffer({
            texture: pingPong.currentPhysics,
            origin: [readOrigin.x, readOrigin.y]
        }, { buffer: physicsBuffer, bytesPerRow: floatBPR }, [readSize.width, readSize.height]);
        enc.copyTextureToBuffer({
            texture: pingPong.currentState,
            origin: [readOrigin.x, readOrigin.y]
        }, { buffer: stateBuffer, bytesPerRow: floatBPR }, [readSize.width, readSize.height]);
        device.queue.submit([enc.finish()]);
        return { identityBuffer, physicsBuffer, stateBuffer, identityBPR, floatBPR };
    }

    /** Saves and unloads every chunk covered by the evicted strip. */
    private async EvictChunkStrip(readOrigin: Vec2, readSize: Size2D, capturedOrigin: Vec2): Promise<void> {
        const chunkSize = ChunkData.GetChunkSize();
        const startCX = Math.floor((readOrigin.x + capturedOrigin.x) / chunkSize);
        const startCY = Math.floor((readOrigin.y + capturedOrigin.y) / chunkSize);
        const endCX = Math.floor((readOrigin.x + readSize.width - 1 + capturedOrigin.x) / chunkSize);
        const endCY = Math.floor((readOrigin.y + readSize.height - 1 + capturedOrigin.y) / chunkSize);
        for (let cy = startCY; cy <= endCY; cy++) {
            for (let cx = startCX; cx <= endCX; cx++) {
                await ChunkManager.Instance?.SaveAndUnload({ cx, cy });
            }
        }
    }

    /** Maps the readback buffers, writes pixel data to CPU chunk memory, destroys the buffers, then evicts the covered chunks. */
    private async CommitStripReadback(params: StripBufferParams): Promise<void> {
        const { buffers } = params;
        const { identityBuffer, physicsBuffer, stateBuffer } = buffers;
        try {
            await Promise.all([
                identityBuffer.mapAsync(GPUMapMode.READ),
                physicsBuffer.mapAsync(GPUMapMode.READ),
                stateBuffer.mapAsync(GPUMapMode.READ),
            ]);
            this.ApplyReadbackToChunks(params);
            identityBuffer.destroy();
            physicsBuffer.destroy();
            stateBuffer.destroy();
            await this.EvictChunkStrip(params.readOrigin, params.readSize, params.capturedOrigin);
        } catch {
            identityBuffer.destroy();
            physicsBuffer.destroy();
            stateBuffer.destroy();
        }
    }

    /** Copies the mapped GPU readback buffers into the matching ChunkEntry CPU buffers, row by row. */
    private ApplyReadbackToChunks(params: StripBufferParams): void {
        const { buffers, readOrigin, readSize, capturedOrigin } = params;
        const { identityBuffer, physicsBuffer, stateBuffer, identityBPR, floatBPR } = buffers;

        const chunkSize = ChunkData.GetChunkSize();
        const identCellBytes = ChunkData.GetIdentityBytesPerCell();
        const floatCellBytes = ChunkData.GetPhysicsBytesPerCell();
        const chunkIdentRowBytes = chunkSize * identCellBytes;
        const chunkFloatRowBytes = chunkSize * floatCellBytes;

        const identData = new Uint8Array(identityBuffer.getMappedRange());
        const physData = new Uint8Array(physicsBuffer.getMappedRange());
        const stateData = new Uint8Array(stateBuffer.getMappedRange());

        const startCX = Math.floor((readOrigin.x + capturedOrigin.x) / chunkSize);
        const startCY = Math.floor((readOrigin.y + capturedOrigin.y) / chunkSize);
        const endCX = Math.floor((readOrigin.x + readSize.width - 1 + capturedOrigin.x) / chunkSize);
        const endCY = Math.floor((readOrigin.y + readSize.height - 1 + capturedOrigin.y) / chunkSize);

        for (let cy = startCY; cy <= endCY; cy++) {
            for (let cx = startCX; cx <= endCX; cx++) {
                const entry: ChunkEntry | null = ChunkManager.Instance?.Get({ cx, cy }) ?? null;
                if (!entry) { continue; }

                const localX = cx * chunkSize - capturedOrigin.x - readOrigin.x;
                const localY = cy * chunkSize - capturedOrigin.y - readOrigin.y;

                const identDest = new Uint8Array(entry.identity);
                const physDest = new Uint8Array(entry.physics);
                const stateDest = new Uint8Array(entry.state);

                for (let row = 0; row < chunkSize; row++) {
                    const identSrc = (localY + row) * identityBPR + localX * identCellBytes;
                    identDest.set(identData.subarray(identSrc, identSrc + chunkIdentRowBytes), row * chunkIdentRowBytes);
                    const floatSrc = (localY + row) * floatBPR + localX * floatCellBytes;
                    physDest.set(physData.subarray(floatSrc, floatSrc + chunkFloatRowBytes), row * chunkFloatRowBytes);
                    stateDest.set(stateData.subarray(floatSrc, floatSrc + chunkFloatRowBytes), row * chunkFloatRowBytes);
                }
            }
        }

        identityBuffer.unmap();
        physicsBuffer.unmap();
        stateBuffer.unmap();
    }

    /** Creates the world metadata file if it doesn't exist, or fetches any that already exist for the current save. */
    private async CreateOrFetchMeta(): Promise<void> {
        const path = 'worlds/meta.json';
        const dm = DataPersistenceManager.Instance;
        if (!dm) { this.seed = Utils.Seed(); return; }

        const { dev } = WorldConfig.GetConfig();
        if (dev.wipeSaveOnLoad) { await dm.DeleteSave(); }

        const existing = await dm.ReadFile(path, false);
        if (existing) {
            const meta: WorldMetadata = JSON.parse(new TextDecoder().decode(existing));
            this.seed = meta.seed;
            LogManager.Instance?.Log({
                text: `World seed loaded from disk: ${this.seed}.`,
                options: { tags: ['World'] }
            });
            return;
        }

        this.seed = Utils.Seed();
        const meta: WorldMetadata = { seed: this.seed };
        await dm.WriteFile(path, new TextEncoder().encode(JSON.stringify(meta)).buffer, false);
        LogManager.Instance?.Log({
            text: `World seed created and saved: ${this.seed}.`,
            options: { tags: ['World'] }
        });
    }

    public async BeforeResize(): Promise<void> {
        await this.ReadbackAndSaveAll();
        LogManager.Instance?.Log({
            text: 'World BeforeResize — all chunks saved.',
            options: { tags: ['World', 'NitrateProcessBeforeResize'] }
        });
    }

    public OnResize(): void {
        this.blit.Reset();
        LogManager.Instance?.Log({
            text: 'World OnResize.',
            options: { tags: ['World'] }
        });
    }

    /** Reads back the entire sim texture to CPU chunk buffers and saves every loaded chunk. */
    private async ReadbackAndSaveAll(): Promise<void> {
        const sim = SimulationManager.Instance;
        const renderer = Renderer.Instance?.GetWebGPU();
        if (!sim?.pingPong || !renderer) { return; }

        const { pingPong } = sim;
        const readOrigin: Vec2 = { x: 0, y: 0 };
        const readSize: Size2D = { width: pingPong.width, height: pingPong.height };
        const buffers = this.PrepareReadback(renderer.device, pingPong, readOrigin, readSize);
        await this.CommitStripReadback({ buffers, readOrigin, readSize, capturedOrigin: this.simOrigin });
    }

    public async BeforeDestroy(): Promise<void> {
        await this.ReadbackAndSaveAll();
        LogManager.Instance?.Log({
            text: 'World BeforeDestroy — all chunks saved.',
            options: { tags: ['World', 'NitrateProcessBeforeDestroy'] }
        });
    }

    public OnDestroy(): void {
        this.blit.Reset();
        if (World.Instance === this) {
            World.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared World singleton instance.',
                options: { tags: ['World', 'NitrateProcessDestroy'] }
            });
        }
    }
}
