import type { GameObjectLayer } from './GameObjectLayer';
import type { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import type { MaterialStateBuffer } from '../materials/MaterialStateBuffer';
import type { PixelCell } from '../component/definitions/pixeldata/PixelData';
import type { ReactionLookupBuffer } from '../materials/ReactionLookupBuffer';
import type { SimulationLayer } from '../simulation/SimulationLayer';
import type { SimulationResource } from '../simulation/SimulationManager';

import { ColliderGenerator } from '../component/ColliderGenerator';
import { GameObjectConfig } from '../config/GameObjectConfig';
import { GameObjectCellSchema } from './GameObjectCellSchema';
import { GameObjectColliderSchema } from './GameObjectColliderSchema';
import { GameObjectBuffers } from './GameObjectBuffers';
import { GameObjectCollisionPass } from './GameObjectCollisionPass';
import { GameObjectPhysicsPass } from './GameObjectPhysicsPass';
import { GameObjectStateSchema } from './GameObjectStateSchema';
import { GameObjectManager } from './GameObjectManager';
import { BoxCollider } from '../component/definitions/collider/boxcollider/BoxCollider';
import { CircleCollider } from '../component/definitions/collider/circlecollider/CircleCollider';
import { PixelBodyCollider } from '../component/definitions/collider/pixelbodycollider/PixelBodyCollider';
import { PixelData } from '../component/definitions/pixeldata/PixelData';
import { Rigidbody } from '../component/definitions/rigidbody/Rigidbody';
import { Transform } from '../component/definitions/transform/Transform';
import { MaterialQuery } from '../materials/MaterialQuery';
import { MaterialVisualSchema } from '../materials/MaterialVisualSchema';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';
import { GameObject } from './GameObject';

interface GameObjectPassParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
    gameObjectLayer: GameObjectLayer;
    physicsBuffer: MaterialPhysicsBuffer;
    stateBuffer: MaterialStateBuffer;
    reactionBuffer: ReactionLookupBuffer;
    gameObjectBuffers: GameObjectBuffers;
}

interface GameObjectRunParams {
    encoder: GPUCommandEncoder;
    simStepDuration: number;
    gravity: number;
    time: number;
}

/**
 * Coordinates all game object GPU passes each simulation step.
 *
 * On first encounter of a new {@link GameObject}, its physics state and cell data are
 * uploaded to the persistent {@link GameObjectBuffers} on the GPU. After that, no per-step CPU
 * involvement is needed for physics — the {@link GameObjectPhysicsPass} integrates velocity and
 * updates positions directly in {@link GameObjectBuffers.stateBuffer}.
 *
 * Each sim step dispatches four sequential GPU passes inside the provided encoder:
 *   1. Erase — clears previous cell positions from the identity and ownership textures.
 *   2. Physics — integrates velocity; saves prevPos, updates posX/posY in the state buffer.
 *   3. Collision — reflects velocity away from occupied sim cells using boundary points.
 *   4. Stamp — reads full cell state (identity, physics, state textures) at previous positions
 *              and writes it to new positions, carrying all per-cell data forward coherently.
 *
 * Ownership swap and all ping-pong swaps are handled by {@link SimulationManager} after
 * this pass submits, consistent with every other pass in the pipeline.
 *
 * Collider rebuilds remain CPU-side for now; they run when {@link PixelBodyCollider.dirty}
 * is set and will be driven by GPU cell-loss detection in a later pass.
 *
 * NOTE: {@link Transform.position} is not written back from the GPU after physics runs.
 * It reflects the spawn position only. A position readback pass will be added alongside
 * collision detection to keep it in sync for editor and debug use.
 *
 * Created and owned by {@link SimulationManager}. Do not call directly.
 */
export class GameObjectPass implements SimulationResource {
    private readonly device: GPUDevice;
    private readonly simulationLayer: SimulationLayer;
    private readonly gameObjectLayer: GameObjectLayer;
    private readonly erasePipeline: GPUComputePipeline;
    private readonly stampPipeline: GPUComputePipeline;
    private readonly gameObjectBuffers: GameObjectBuffers;
    private readonly physicsPass: GameObjectPhysicsPass;
    private readonly collisionPass: GameObjectCollisionPass;
    private readonly materialPhysicsBuffer: MaterialPhysicsBuffer;
    private readonly materialStateBuffer: MaterialStateBuffer;
    private readonly reactionBuffer: ReactionLookupBuffer;
    private readonly workgroupSize: number;

    public get colliderBuffer(): GPUBuffer { return this.gameObjectBuffers.colliderBuffer; }
    public get stateBuffer(): GPUBuffer { return this.gameObjectBuffers.stateBuffer; }
    public get cellBuffer(): GPUBuffer { return this.gameObjectBuffers.cellBuffer; }

    // @omitfromdocs
    public GetTotalSlots(): number { return this.nextSlot; }
    // @omitfromdocs
    public GetTotalBoundaryPoints(): number { return this.totalBoundaryPoints; }

    // Slot tracking — persists for the lifetime of the pass
    private readonly gameObjectSlots = new Map<number, number>(); // GameObject id → state buffer slot index
    private nextSlot: number = 0;
    private totalCells: number = 0;
    private totalBoundaryPoints: number = 0;
    private readbackInFlight: boolean = false;

    // Collider rebuild tracking
    private readonly maxBoundaryCounts = new Map<number, number>();   // slot → max points (original alloc)
    private readonly previousDeadCounts = new Map<number, number>();  // slot → last seen dead count

    private constructor(
        params: GameObjectPassParams,
        erasePipeline: GPUComputePipeline,
        stampPipeline: GPUComputePipeline,
        gameObjectBuffers: GameObjectBuffers,
        physicsPass: GameObjectPhysicsPass,
        collisionPass: GameObjectCollisionPass,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.simulationLayer = params.simulationLayer;
        this.gameObjectLayer = params.gameObjectLayer;
        this.erasePipeline = erasePipeline;
        this.stampPipeline = stampPipeline;
        this.gameObjectBuffers = gameObjectBuffers;
        this.physicsPass = physicsPass;
        this.collisionPass = collisionPass;
        this.materialPhysicsBuffer = params.physicsBuffer;
        this.materialStateBuffer = params.stateBuffer;
        this.reactionBuffer = params.reactionBuffer;
        this.workgroupSize = workgroupSize;
    }

    /** Compiles erase and stamp shaders, creates sub-passes, and returns a ready-to-use pass. @internal */
    public static async Create(params: GameObjectPassParams): Promise<GameObjectPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const gameObjectBuffers = params.gameObjectBuffers;

        const [erasePipeline, stampPipeline, physicsPass, collisionPass] = await Promise.all([
            params.device.createComputePipelineAsync({
                layout: 'auto',
                compute: {
                    module: params.device.createShaderModule({
                        code: ShaderAssembler.GameObjectErase(workgroupSize),
                    }),
                    entryPoint: 'main',
                },
            }),
            params.device.createComputePipelineAsync({
                layout: 'auto',
                compute: {
                    module: params.device.createShaderModule({
                        code: ShaderAssembler.GameObjectStamp(workgroupSize),
                    }),
                    entryPoint: 'main',
                },
            }),
            GameObjectPhysicsPass.Create({
                device: params.device,
                buffers: gameObjectBuffers
            }),
            GameObjectCollisionPass.Create({
                device: params.device,
                buffers: gameObjectBuffers,
                physicsBuffer: params.physicsBuffer,
            }),
        ]);

        return new GameObjectPass(
            params,
            erasePipeline,
            stampPipeline,
            gameObjectBuffers,
            physicsPass,
            collisionPass,
            workgroupSize
        );
    }

    /**
     * Uploads initial physics state, cell data, and boundary points for a newly
     * encountered game object. Called lazily from Run() on first encounter — not
     * on every frame.
     */
    private UploadGameObject(gameObject: GameObject): void {
        const transform = gameObject.GetComponent(Transform);
        const pixelData = gameObject.GetComponent(PixelData);
        if (!transform || !pixelData) { return; }

        const rigidbody = gameObject.GetComponent(Rigidbody);
        const colorsPerMaterial = MaterialVisualSchema.GetColorsPerMaterial();
        const pivotX = pixelData.pivot.x;
        const pivotY = pixelData.pivot.y;

        const filledCells = pixelData.cells.filter(c => c.materialId !== 0);
        const staticCells = filledCells.filter(c => (c.occupancy ?? 2) !== 1);
        const dynamicCells = filledCells.filter(c => (c.occupancy ?? 2) === 1);

        if (staticCells.length === 0) {
            this.WriteDynamicCellsToSim(dynamicCells, transform, pivotX, pivotY);
            this.gameObjectSlots.set(gameObject.id, -1);
            return;
        }

        const slot = this.nextSlot++;
        const cellOffset = this.totalCells;

        // Build boundary points from the first non-trigger collider found
        const boxCollider = gameObject.GetComponent(BoxCollider);
        const circleCollider = gameObject.GetComponent(CircleCollider);
        const pixelBodyCollider = gameObject.GetComponent(PixelBodyCollider);

        let boundaryOffset = 0;
        let boundaryCount = 0;

        const activeCollider = boxCollider ?? circleCollider ?? pixelBodyCollider;
        if (activeCollider && !activeCollider.isTrigger) {
            let boundaryPoints;
            if (boxCollider) {
                // Box/circle offsets are pivot-relative; add pivot to match cell.pos space so the
                // shader's pivot subtraction doesn't double-subtract.
                boundaryPoints = ColliderGenerator.BuildBoxBoundary(boxCollider.offset, boxCollider.size)
                    .map(p => ({ x: p.x + pivotX, y: p.y + pivotY }));
            } else if (circleCollider) {
                boundaryPoints = ColliderGenerator.BuildCircleBoundary(circleCollider.offset, circleCollider.radius)
                    .map(p => ({ x: p.x + pivotX, y: p.y + pivotY }));
            } else {
                boundaryPoints = ColliderGenerator.BuildPixelBodyBoundary(staticCells);
            }

            if (boundaryPoints.length > 0) {
                boundaryOffset = this.totalBoundaryPoints;
                boundaryCount = boundaryPoints.length;

                const pointBuf = new ArrayBuffer(boundaryPoints.length * GameObjectColliderSchema.byteStride);
                const pi = new Int32Array(pointBuf);
                for (let i = 0; i < boundaryPoints.length; i++) {
                    pi[i * GameObjectColliderSchema.stride] = boundaryPoints[i].x;
                    pi[i * GameObjectColliderSchema.stride + 1] = -boundaryPoints[i].y; // canvas-Y → sim-Y
                }
                this.device.queue.writeBuffer(
                    this.gameObjectBuffers.colliderBuffer,
                    boundaryOffset * GameObjectColliderSchema.byteStride,
                    pointBuf
                );
                this.totalBoundaryPoints += boundaryCount;
            }
        }

        // Pack GameObjectState into a shared ArrayBuffer so f32 and u32 fields coexist correctly
        const stateBuf = new ArrayBuffer(GameObjectStateSchema.byteStride);
        const sf = new Float32Array(stateBuf);
        const su = new Uint32Array(stateBuf);

        sf[0] = transform.position.x;
        sf[1] = transform.position.y;
        sf[2] = transform.position.x; // prevPosX — same as posX on first upload
        sf[3] = transform.position.y; // prevPosY — same as posY on first upload
        sf[4] = rigidbody ? rigidbody.velocity.x : 0;
        sf[5] = rigidbody ? rigidbody.velocity.y : 0;
        sf[6] = rigidbody ? rigidbody.gravityScale : 0;
        sf[7] = rigidbody ? rigidbody.drag : 0;
        sf[8] = pivotX;
        sf[9] = -pivotY; // canvas-Y → sim-Y
        su[10] = gameObject.id;
        su[11] = cellOffset;
        su[12] = staticCells.length;
        su[13] = rigidbody ? Rigidbody.BodyTypeValue[rigidbody.bodyType] : Rigidbody.BodyTypeValue.Static;
        su[14] = 1; // isActive
        su[15] = 0; // colliderDirty
        su[16] = boundaryOffset;
        su[17] = boundaryCount;
        sf[18] = rigidbody ? rigidbody.bounciness : 0;
        sf[19] = rigidbody ? rigidbody.friction : 0;
        sf[20] = rigidbody ? rigidbody.mass : 1;
        su[21] = 0; // isSleeping
        su[22] = 0; // hitCount
        sf[23] = 0; // theta — initial angle matches Transform.rotation; kept in sync via readback
        sf[24] = rigidbody ? rigidbody.angularVelocity : 0; // omega
        sf[25] = 0; // prevTheta — same as theta on first upload
        sf[26] = rigidbody ? rigidbody.angularDrag : 0;
        su[27] = 0; // sleepTimer

        // Moment of inertia about the pivot: I = mass * Σ(dx² + dy²) / cellCount
        const sumSquaredRadius = staticCells.reduce((acc, c) => {
            const dx = c.pos.x - pivotX;
            const dy = c.pos.y - pivotY;
            return acc + dx * dx + dy * dy;
        }, 0);
        const mass = rigidbody ? rigidbody.mass : 1;
        sf[28] = Math.max(0.001, mass * sumSquaredRadius / Math.max(1, staticCells.length));
        sf[29] = mass; // accumulatedMass — equals intrinsic mass on spawn, updated by collision pass


        this.device.queue.writeBuffer(
            this.gameObjectBuffers.stateBuffer,
            slot * GameObjectStateSchema.byteStride,
            stateBuf
        );

        // Pack static cells into the flat GPU cell buffer
        const cellBuf = new ArrayBuffer(staticCells.length * GameObjectCellSchema.byteStride);
        const ci = new Int32Array(cellBuf);
        const cu = new Uint32Array(cellBuf);
        const cf = new Float32Array(cellBuf);

        for (let i = 0; i < staticCells.length; i++) {
            const cell = staticCells[i];
            const base = i * GameObjectCellSchema.stride;
            ci[base] = cell.pos.x;
            ci[base + 1] = -cell.pos.y; // canvas-Y → sim-Y
            cu[base + 2] = slot;
            cu[base + 3] = gameObject.id;
            cu[base + 4] = cell.materialId;
            cf[base + 5] = (cell.colorVariant + 0.5) / colorsPerMaterial;
            cu[base + 6] = cell.variantId ?? 0;
            cu[base + 7] = cell.occupancy ?? 2;
        }

        this.device.queue.writeBuffer(
            this.gameObjectBuffers.cellBuffer,
            cellOffset * GameObjectCellSchema.byteStride,
            cellBuf
        );

        if (dynamicCells.length > 0) {
            this.WriteDynamicCellsToSim(dynamicCells, transform, pivotX, pivotY);
        }

        this.gameObjectSlots.set(gameObject.id, slot);
        this.maxBoundaryCounts.set(slot, boundaryCount);
        this.totalCells += staticCells.length;
    }

    private WriteDynamicCellsToSim(
        cells: PixelCell[],
        transform: Transform,
        pivotX: number,
        pivotY: number
    ): void {
        const simW = this.simulationLayer.width;
        const simH = this.simulationLayer.height;
        const maxDensity = MaterialQuery.GetMaxDensity();
        const colorsPerMaterial = MaterialVisualSchema.GetColorsPerMaterial();

        for (const cell of cells) {
            const simX = Math.round(transform.position.x + cell.pos.x - pivotX);
            const simY = Math.round(transform.position.y - cell.pos.y + pivotY);
            if (simX < 0 || simY < 0 || simX >= simW || simY >= simH) { continue; }
            const texY = simY;

            const material = MaterialQuery.GetById(cell.materialId);
            if (!material) { continue; }

            const identityData = new Uint8Array([
                cell.materialId,
                Math.round(((cell.colorVariant + 0.5) / colorsPerMaterial) * 255),
                cell.variantId ?? 0,
                1, // OCCUPANCY_DYNAMIC
            ]);
            this.device.queue.writeTexture(
                { texture: this.simulationLayer.nextIdentity, origin: { x: simX, y: texY, z: 0 } },
                identityData,
                { bytesPerRow: 4 },
                { width: 1, height: 1 }
            );

            const physicsData = new Float32Array([
                material.physics.temperature.restingTemperature,
                material.physics.density / maxDensity,
                0, 0,
            ]);
            this.device.queue.writeTexture(
                { texture: this.simulationLayer.nextPhysics, origin: { x: simX, y: texY, z: 0 } },
                physicsData,
                { bytesPerRow: 16 },
                { width: 1, height: 1 }
            );

            const spawnLifetime = (material.state.lifetime ?? 0) > 0 ? 1.0 : 0.0;
            this.device.queue.writeTexture(
                { texture: this.simulationLayer.nextState, origin: { x: simX, y: texY, z: 0 } },
                new Float32Array([1.0, spawnLifetime, 0, 0]),
                { bytesPerRow: 16 },
                { width: 1, height: 1 }
            );
        }
    }

    /** Uploads new GOs and dispatches the erase pass. Call before submitting encoder A. @internal */
    public RunErase(params: GameObjectRunParams): void {
        const manager = GameObjectManager.Instance;
        if (!manager) { return; }

        // Upload any GameObjects that haven't been seen before
        for (const gameObject of manager.GetAll()) {
            if (!this.gameObjectSlots.has(gameObject.id)) { this.UploadGameObject(gameObject); }
        }

        // Collider rebuilds — CPU-side; driven by dirty flag (set by cell-loss detection later)
        for (const gameObject of manager.GetAll()) {
            const collider = gameObject.GetComponent(PixelBodyCollider);
            const pixelData = gameObject.GetComponent(PixelData);
            if (!collider || !pixelData || !collider.dirty) { continue; }
            collider.dirty = false;
        }

        if (this.totalCells === 0) { return; }

        const { encoder } = params;
        const { gameObjectLayer, device, gameObjectBuffers } = this;

        gameObjectLayer.ClearNextTextures(encoder);

        const eraseUniformData = new ArrayBuffer(32);
        const eraseU32 = new Uint32Array(eraseUniformData);
        const eraseF32 = new Float32Array(eraseUniformData);
        eraseU32[0] = this.totalCells;
        eraseU32[1] = gameObjectLayer.width;
        eraseU32[2] = gameObjectLayer.height;
        eraseF32[5] = GameObjectConfig.GetConfig().physics.bleed.threshold;
        device.queue.writeBuffer(gameObjectBuffers.eraseUniformBuffer, 0, eraseUniformData);

        const eraseBindGroup = device.createBindGroup({
            layout: this.erasePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: gameObjectBuffers.cellBuffer } },
                { binding: 1, resource: { buffer: gameObjectBuffers.stateBuffer } },
                { binding: 2, resource: { buffer: gameObjectBuffers.eraseUniformBuffer } },
                { binding: 3, resource: gameObjectLayer.currentOwnership.createView() },
                { binding: 4, resource: gameObjectLayer.nextIdentity.createView() },
                { binding: 5, resource: gameObjectLayer.nextOwnership.createView() },
            ],
        });
        const erasePass = encoder.beginComputePass();
        erasePass.setPipeline(this.erasePipeline);
        erasePass.setBindGroup(0, eraseBindGroup);
        erasePass.dispatchWorkgroups(Math.ceil(this.totalCells / this.workgroupSize));
        erasePass.end();
    }

    /** Dispatches physics, collision, and stamp passes. Call after encoder A is submitted and textures are swapped. @internal */
    public RunStamp(params: GameObjectRunParams): void {
        if (this.totalCells === 0) { return; }

        const { encoder, gravity, simStepDuration, time } = params;
        const { simulationLayer, gameObjectLayer, device, gameObjectBuffers } = this;

        const stampUniformData = new ArrayBuffer(32);
        const stampU32 = new Uint32Array(stampUniformData);
        const stampF32 = new Float32Array(stampUniformData);
        stampU32[0] = this.totalCells;
        stampU32[1] = gameObjectLayer.width;
        stampU32[2] = gameObjectLayer.height;
        stampF32[3] = simStepDuration;
        stampF32[4] = time;
        stampF32[5] = GameObjectConfig.GetConfig().physics.bleed.threshold;
        device.queue.writeBuffer(gameObjectBuffers.stampUniformBuffer, 0, stampUniformData);

        // Physics — save prevPos, integrate velocity, update positions in state buffer
        this.physicsPass.Run({ encoder, gravity, simStepDuration });

        // Collision — reflect velocity away from occupied sim cells
        this.collisionPass.Run({ encoder, simulationLayer, gameObjectLayer, gravity, simStepDuration });

        // Stamp — carry full cell state (identity, physics, state) from prevPos to new pos
        const stampBindGroup = device.createBindGroup({
            layout: this.stampPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: gameObjectBuffers.cellBuffer } },
                { binding: 1, resource: { buffer: gameObjectBuffers.stateBuffer } },
                { binding: 2, resource: { buffer: gameObjectBuffers.stampUniformBuffer } },
                { binding: 3, resource: gameObjectLayer.currentIdentity.createView() },
                { binding: 4, resource: gameObjectLayer.currentOwnership.createView() },
                { binding: 5, resource: gameObjectLayer.nextIdentity.createView() },
                { binding: 6, resource: gameObjectLayer.nextOwnership.createView() },
                { binding: 7, resource: gameObjectLayer.currentPhysics.createView() },
                { binding: 8, resource: gameObjectLayer.nextPhysics.createView() },
                { binding: 9, resource: gameObjectLayer.currentState.createView() },
                { binding: 10, resource: gameObjectLayer.nextState.createView() },
                { binding: 11, resource: { buffer: gameObjectBuffers.deadCellBuffer } },
                { binding: 12, resource: simulationLayer.nextIdentity.createView() },
                { binding: 13, resource: { buffer: this.materialPhysicsBuffer.buffer } },
                { binding: 14, resource: { buffer: this.materialStateBuffer.buffer } },
                { binding: 15, resource: simulationLayer.nextPhysics.createView() },
                { binding: 16, resource: simulationLayer.nextState.createView() },
                { binding: 17, resource: simulationLayer.currentIdentity.createView() },
                { binding: 18, resource: { buffer: this.reactionBuffer.buffer } },
                { binding: 19, resource: gameObjectLayer.currentIdentity.createView() },
            ],
        });
        const stampPass = encoder.beginComputePass();
        stampPass.setPipeline(this.stampPipeline);
        stampPass.setBindGroup(0, stampBindGroup);
        stampPass.dispatchWorkgroups(Math.ceil(this.totalCells / this.workgroupSize));
        stampPass.end();

        // Queue a copy of the state buffer into the readback buffer so ReadbackPositions()
        // can map it after this encoder is submitted. Skipped if a readback is already in-flight.
        if (!this.readbackInFlight) {
            const stateCopySize = this.nextSlot * GameObjectStateSchema.byteStride;
            if (stateCopySize > 0) {
                encoder.copyBufferToBuffer(
                    gameObjectBuffers.stateBuffer, 0,
                    gameObjectBuffers.stateReadbackBuffer, 0,
                    stateCopySize
                );
            }
            const deadCopySizeBytes = this.totalCells * 4;
            if (deadCopySizeBytes > 0) {
                encoder.copyBufferToBuffer(
                    gameObjectBuffers.deadCellBuffer, 0,
                    gameObjectBuffers.deadCellReadbackBuffer, 0,
                    deadCopySizeBytes
                );
            }
        }
    }

    /**
     * Maps the state readback buffer and writes posX/posY back to each GameObject's
     * Transform.position. Called by SimulationManager after the encoder is submitted.
     * Fire-and-forget — do not await. @internal
     */
    public async ReadbackPositions(): Promise<void> {
        if (this.readbackInFlight || this.nextSlot === 0) { return; }
        this.readbackInFlight = true;

        const { stateReadbackBuffer, deadCellReadbackBuffer } = this.gameObjectBuffers;
        await Promise.all([
            stateReadbackBuffer.mapAsync(GPUMapMode.READ),
            deadCellReadbackBuffer.mapAsync(GPUMapMode.READ),
        ]);

        const stateMappedRange = stateReadbackBuffer.getMappedRange(0, this.nextSlot * GameObjectStateSchema.byteStride);
        const dataF32 = new Float32Array(stateMappedRange);
        const dataU32 = new Uint32Array(stateMappedRange);

        const deadMappedRange = deadCellReadbackBuffer.getMappedRange(0, this.totalCells * 4);
        const deadCellData = new Uint32Array(deadMappedRange);

        const toDestroy: number[] = [];

        for (const [gameObjectId, slot] of this.gameObjectSlots) {
            if (slot === -1) { continue; }
            const base = slot * GameObjectStateSchema.stride;
            const gameObject = GameObjectManager.Instance?.Get(gameObjectId);
            if (!gameObject) { continue; }

            const cellOffset = dataU32[base + 11];
            const cellCount = dataU32[base + 12];
            if (cellCount > 0) {
                let deadCount = 0;
                for (let c = cellOffset; c < cellOffset + cellCount; c++) {
                    if (deadCellData[c] !== 0) { deadCount++; }
                }
                if (deadCount === cellCount) {
                    toDestroy.push(gameObjectId);
                } else if (deadCount > 0 && deadCount !== (this.previousDeadCounts.get(slot) ?? 0)) {
                    this.previousDeadCounts.set(slot, deadCount);
                    this.RebuildPixelBodyCollider(gameObject, slot, cellOffset, deadCellData, dataU32, base);
                }
            }

            const transform = gameObject.GetComponent(Transform);
            if (transform) {
                transform.position.x = dataF32[base + 0];
                transform.position.y = dataF32[base + 1];
                transform.rotation = dataF32[base + 23]; // theta
            }

            const rigidbody = gameObject.GetComponent(Rigidbody);
            if (rigidbody) {
                rigidbody.isSleeping = dataU32[base + 21] === 1;
                rigidbody.angularVelocity = dataF32[base + 24]; // omega
            }
        }

        stateReadbackBuffer.unmap();
        deadCellReadbackBuffer.unmap();
        this.readbackInFlight = false;

        for (const gameObjectId of toDestroy) {
            const slot = this.gameObjectSlots.get(gameObjectId);
            if (slot === undefined || slot === -1) { continue; }
            this.gameObjectSlots.delete(gameObjectId);
            GameObjectManager.Instance?.Get(gameObjectId)?.Destroy();
            const inactiveOffset = slot * GameObjectStateSchema.byteStride + 14 * 4;
            this.device.queue.writeBuffer(
                this.gameObjectBuffers.stateBuffer, inactiveOffset, new Uint32Array([0])
            );
        }
    }

    private RebuildPixelBodyCollider(
        gameObject: GameObject,
        slot: number,
        cellOffset: number,
        deadCellData: Uint32Array,
        stateU32: Uint32Array,
        stateBase: number,
    ): void {
        const pixelBodyCollider = gameObject.GetComponent(PixelBodyCollider);
        const pixelData = gameObject.GetComponent(PixelData);
        if (!pixelBodyCollider || pixelBodyCollider.isTrigger || !pixelData) { return; }

        const filledCells = pixelData.cells.filter(c => c.materialId !== 0);
        const boundaryOffset = stateU32[stateBase + 16];
        const maxPoints = this.maxBoundaryCounts.get(slot) ?? 0;

        const newPoints = ColliderGenerator.RebuildPixelBodyBoundary(filledCells, deadCellData, cellOffset);
        const newCount = Math.min(newPoints.length, maxPoints);

        if (newCount > 0) {
            const pointBuf = new ArrayBuffer(newCount * GameObjectColliderSchema.byteStride);
            const pi = new Int32Array(pointBuf);
            for (let i = 0; i < newCount; i++) {
                pi[i * GameObjectColliderSchema.stride] = newPoints[i].x;
                pi[i * GameObjectColliderSchema.stride + 1] = -newPoints[i].y;
            }
            this.device.queue.writeBuffer(
                this.gameObjectBuffers.colliderBuffer,
                boundaryOffset * GameObjectColliderSchema.byteStride,
                pointBuf
            );
        }

        const boundaryCountOffset = slot * GameObjectStateSchema.byteStride + 17 * 4;
        this.device.queue.writeBuffer(
            this.gameObjectBuffers.stateBuffer,
            boundaryCountOffset,
            new Uint32Array([newCount])
        );
    }

    // @omitfromdocs
    public Destroy(): void { }
}
