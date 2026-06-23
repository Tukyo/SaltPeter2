import type { ChunkEntry } from './chunk/ChunkData';
import type { SimulationLayer } from '../simulation/SimulationLayer';
import type { Size2D, Vec2 } from '../definitions/Primitives';

import { Camera } from '../component/definitions/camera/Camera';
import { Transform } from '../component/definitions/transform/Transform';
import { ChunkData } from './chunk/ChunkData';
import { ChunkManager } from './chunk/ChunkManager';
import { DataConfig } from '../config/DataConfig';
import { DataPersistenceManager } from '../data_persistence/DataPersistenceManager';
import { GameObjectLayer } from '../game_object/GameObjectLayer';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { Renderer } from '../rendering/Renderer';
import { SimulationManager } from '../simulation/SimulationManager';
import { WorldBlit } from './WorldBlit';
import { WorldConfig } from '../config/WorldConfig';
import { WorldGen } from './WorldGen';
import { WorldMap } from './WorldMap';
import { WorldStampRegistry } from './WorldStampRegistry';
import { Utils } from '../utility/Utils';

export interface WorldMetadata {
    seed: number;
}

interface HorizontalShiftParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
    gameObjectLayer: GameObjectLayer;
    chunkSize: number;
    offsetCellsX: number;
}

interface VerticalShiftParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
    gameObjectLayer: GameObjectLayer;
    chunkSize: number;
    offsetCellsY: number;
}

interface StripReadbackParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
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

    public stampRegistry: WorldStampRegistry | null = null;

    private simOrigin: Vec2 = { x: 0, y: 0 };
    /** Returns the world-space cell coordinate of the simulation texture's top-left corner. */
    public GetSimOrigin(): Vec2 { return this.simOrigin; }

    private seed: number = 0;
    /** Returns the world seed. Loaded from disk on resume, or randomly generated on first run. */
    public GetSeed(): number { return this.seed; }

    private isWorldReady: Promise<void> = Promise.resolve();
    /** Resolves once the world seed has been loaded or created. Await before using the seed in generation. */
    public IsWorldReady(): Promise<void> { return this.isWorldReady; }

    private readonly blit = new WorldBlit();
    private isInitialized: boolean = false;

    constructor() {
        super();
        this.Register();

        World.Instance = this;

        new ChunkManager();
    }

    public Awake(): void {
        LogManager.Instance?.Log({
            text: 'World awake.',
            options: { tags: ['World', 'NitrateProcessInit'] }
        });

        this.isWorldReady = this.CreateOrFetchMeta()
            .then(() => WorldStampRegistry.LoadTemplates())
            .then(() => { this.SetupStamps(); });

        SimulationManager.Instance?.state.SetResolutionScale(0.25);
    }

    public Update(): void {
        const sim = SimulationManager.Instance;
        const renderer = Renderer.Instance?.GetWebGPU();
        if (!sim?.simulationLayer || !sim?.gameObjectLayer || !renderer) { return; }

        if (!this.blit.IsReady()) {
            this.blit.Allocate(renderer.device, sim.simulationLayer);
        }

        const camPos = Camera.Main?.gameObject?.GetComponent(Transform)?.position ?? null;
        if (!camPos) { return; }

        const { simulationLayer, gameObjectLayer } = sim;
        const chunkSize = ChunkData.GetChunkSize();
        const { chunk } = WorldConfig.GetConfig();
        const margin = chunk.margin * chunk.size;
        const contentWidth = simulationLayer.width - 2 * margin;
        const contentHeight = simulationLayer.height - 2 * margin;

        if (!this.isInitialized) {
            this.simOrigin.x = Math.floor((camPos.x - simulationLayer.width / 2) / chunkSize) * chunkSize;
            this.simOrigin.y = Math.floor((camPos.y - simulationLayer.height / 2) / chunkSize) * chunkSize;
            this.isInitialized = true;
            if (SimulationManager.Instance) { SimulationManager.Instance.enabled = false; }
            (ChunkManager.Instance?.InitializeChunks(renderer.device, simulationLayer, { width: simulationLayer.width, height: simulationLayer.height }) ?? Promise.resolve())
                .then(() => { if (SimulationManager.Instance) { SimulationManager.Instance.enabled = true; } });
            return;
        }

        const offsetCellsX = (camPos.x - this.simOrigin.x) - contentWidth / 2 - margin;
        const offsetCellsY = (camPos.y - this.simOrigin.y) - contentHeight / 2 - margin;

        this.HandleHorizontalShift({
            device: renderer.device,
            simulationLayer,
            gameObjectLayer,
            chunkSize,
            offsetCellsX
        });
        this.HandleVerticalShift({
            device: renderer.device,
            simulationLayer,
            gameObjectLayer,
            chunkSize,
            offsetCellsY
        });
    }

    /** Checks the horizontal camera offset and shifts the sim window left or right by one chunk if the threshold is exceeded. */
    private HandleHorizontalShift(params: HorizontalShiftParams): void {
        const { device, simulationLayer, gameObjectLayer, chunkSize, offsetCellsX } = params;
        const simDebounce = WorldConfig.GetConfig().performance.simDebounce;

        if (offsetCellsX > chunkSize) {
            const ox = this.simOrigin.x; const oy = this.simOrigin.y;
            this.simOrigin.x += chunkSize;
            SimulationManager.Instance?.gameObjectPass?.OnSimOriginShift(-chunkSize, 0);
            this.BeginStripReadback({ device, simulationLayer, delta: { x: chunkSize, y: 0 }, capturedOrigin: { x: ox, y: oy } });
            this.blit.Blit(device, simulationLayer, gameObjectLayer, { x: chunkSize, y: 0 });
            ChunkManager.Instance?.UploadEdgeChunks(device, simulationLayer, { x: chunkSize, y: 0 }, this.simOrigin);
            SimulationManager.Instance?.Debounce(simDebounce);
            LogManager.Instance?.Log({ text: 'World scrolled right — loaded new chunk column.', options: { tags: ['World'], noisy: true } });
        } else if (offsetCellsX < -chunkSize) {
            const ox = this.simOrigin.x; const oy = this.simOrigin.y;
            this.simOrigin.x -= chunkSize;
            SimulationManager.Instance?.gameObjectPass?.OnSimOriginShift(chunkSize, 0);
            this.BeginStripReadback({ device, simulationLayer, delta: { x: -chunkSize, y: 0 }, capturedOrigin: { x: ox, y: oy } });
            this.blit.Blit(device, simulationLayer, gameObjectLayer, { x: -chunkSize, y: 0 });
            ChunkManager.Instance?.UploadEdgeChunks(device, simulationLayer, { x: -chunkSize, y: 0 }, this.simOrigin);
            SimulationManager.Instance?.Debounce(simDebounce);
            LogManager.Instance?.Log({ text: 'World scrolled left — loaded new chunk column.', options: { tags: ['World'], noisy: true } });
        }
    }

    /** Checks the vertical camera offset and shifts the sim window up or down by one chunk if the threshold is exceeded. */
    private HandleVerticalShift(params: VerticalShiftParams): void {
        const { device, simulationLayer, gameObjectLayer, chunkSize, offsetCellsY } = params;
        const simDebounce = WorldConfig.GetConfig().performance.simDebounce;

        if (offsetCellsY > chunkSize) {
            const ox = this.simOrigin.x; const oy = this.simOrigin.y;
            this.simOrigin.y += chunkSize;
            SimulationManager.Instance?.gameObjectPass?.OnSimOriginShift(0, -chunkSize);
            this.BeginStripReadback({ device, simulationLayer, delta: { x: 0, y: chunkSize }, capturedOrigin: { x: ox, y: oy } });
            this.blit.Blit(device, simulationLayer, gameObjectLayer, { x: 0, y: chunkSize });
            ChunkManager.Instance?.UploadEdgeChunks(device, simulationLayer, { x: 0, y: chunkSize }, this.simOrigin);
            SimulationManager.Instance?.Debounce(simDebounce);
            LogManager.Instance?.Log({ text: 'World scrolled up — loaded new chunk row.', options: { tags: ['World'], noisy: true } });
        } else if (offsetCellsY < -chunkSize) {
            const ox = this.simOrigin.x; const oy = this.simOrigin.y;
            this.simOrigin.y -= chunkSize;
            SimulationManager.Instance?.gameObjectPass?.OnSimOriginShift(0, chunkSize);
            this.BeginStripReadback({ device, simulationLayer, delta: { x: 0, y: -chunkSize }, capturedOrigin: { x: ox, y: oy } });
            this.blit.Blit(device, simulationLayer, gameObjectLayer, { x: 0, y: -chunkSize });
            ChunkManager.Instance?.UploadEdgeChunks(device, simulationLayer, { x: 0, y: -chunkSize }, this.simOrigin);
            SimulationManager.Instance?.Debounce(simDebounce);
            LogManager.Instance?.Log({ text: 'World scrolled down — loaded new chunk row.', options: { tags: ['World'], noisy: true } });
        }
    }

    /** Computes the strip region from the delta, calls PrepareReadback, then fires CommitStripReadback. */
    private BeginStripReadback(params: StripReadbackParams): void {
        const { device, simulationLayer, delta, capturedOrigin } = params;
        const { width, height } = simulationLayer;
        const absDx = Math.abs(delta.x);
        const absDy = Math.abs(delta.y);
        const readOrigin: Vec2 = { x: delta.x < 0 ? width - absDx : 0, y: delta.y < 0 ? height - absDy : 0 };
        const readSize: Size2D = { width: delta.x !== 0 ? absDx : width, height: delta.y !== 0 ? absDy : height };
        const buffers = this.PrepareReadback(device, simulationLayer, readOrigin, readSize);
        this.CommitStripReadback({ buffers, readOrigin, readSize, capturedOrigin });
    }

    /** Allocates GPU readback buffers, submits copy commands for the given region, and returns the buffers and row strides. */
    private PrepareReadback(device: GPUDevice, simulationLayer: SimulationLayer, readOrigin: Vec2, readSize: Size2D): ReadbackBuffers {
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
            texture: simulationLayer.currentIdentity,
            origin: [readOrigin.x, readOrigin.y]
        }, { buffer: identityBuffer, bytesPerRow: identityBPR }, [readSize.width, readSize.height]);
        enc.copyTextureToBuffer({
            texture: simulationLayer.currentPhysics,
            origin: [readOrigin.x, readOrigin.y]
        }, { buffer: physicsBuffer, bytesPerRow: floatBPR }, [readSize.width, readSize.height]);
        enc.copyTextureToBuffer({
            texture: simulationLayer.currentState,
            origin: [readOrigin.x, readOrigin.y]
        }, { buffer: stateBuffer, bytesPerRow: floatBPR }, [readSize.width, readSize.height]);
        device.queue.submit([enc.finish()]);
        return { identityBuffer, physicsBuffer, stateBuffer, identityBPR, floatBPR };
    }

    /** Maps the readback buffers, writes pixel data to CPU chunk memory, then destroys the buffers. */
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
                if (!ChunkManager.Instance?.IsUploaded({ cx, cy })) { continue; }

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

    private SetupStamps(): void {
        this.stampRegistry = new WorldStampRegistry();
        this.stampRegistry.Fill(this.seed);
        WorldGen.SetStamps(this.stampRegistry.GetStamps());
        const erosion = WorldMap.GetMap().find(chunk => chunk.stampRegion?.erosion)?.stampRegion?.erosion ?? null;
        WorldGen.SetStampErosionConfig(erosion);
    }

    /** Creates the world metadata file if it doesn't exist, or fetches any that already exist for the current save. */
    private async CreateOrFetchMeta(): Promise<void> {
        const { dev } = WorldConfig.GetConfig();
        const { world } = DataConfig.GetConfig();
        const path = `${world.worldPath}/meta.json`;
        const dm = DataPersistenceManager.Instance;
        if (!dm) { this.seed = Utils.Seed(); return; }
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
        this.isInitialized = false;
        LogManager.Instance?.Log({
            text: 'World OnResize.',
            options: { tags: ['Resize', 'World'] }
        });
    }

    /** Reads back the entire sim texture to update all in-memory chunk buffers, then saves every chunk to disk. */
    private async ReadbackAndSaveAll(): Promise<void> {
        const sim = SimulationManager.Instance;
        const renderer = Renderer.Instance?.GetWebGPU();
        if (!sim?.simulationLayer || !renderer) { return; }

        const { simulationLayer } = sim;
        const readOrigin: Vec2 = { x: 0, y: 0 };
        const readSize: Size2D = { width: simulationLayer.width, height: simulationLayer.height };
        const buffers = this.PrepareReadback(renderer.device, simulationLayer, readOrigin, readSize);
        await this.CommitStripReadback({ buffers, readOrigin, readSize, capturedOrigin: this.simOrigin });
        await ChunkManager.Instance?.SaveAll();
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
