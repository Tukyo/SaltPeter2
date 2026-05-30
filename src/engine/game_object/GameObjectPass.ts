import type { PingPongTargets } from '../simulation/PingPongTargets';

import { ColliderGenerator } from '../component/ColliderGenerator';
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
import { MaterialVisualSchema } from '../materials/MaterialVisualSchema';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';
import { GameObject } from './GameObject';

interface GameObjectPassParams {
    device: GPUDevice;
    targets: PingPongTargets;
}

interface GameObjectRunParams {
    encoder: GPUCommandEncoder;
    simStepDuration: number;
    gravity: number;
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
export class GameObjectPass {
    private readonly device: GPUDevice;
    private readonly targets: PingPongTargets;
    private readonly erasePipeline: GPUComputePipeline;
    private readonly stampPipeline: GPUComputePipeline;
    private readonly gameObjectBuffers: GameObjectBuffers;
    private readonly physicsPass: GameObjectPhysicsPass;
    private readonly collisionPass: GameObjectCollisionPass;
    private readonly workgroupSize: number;

    // Slot tracking — persists for the lifetime of the pass
    private readonly gameObjectSlots = new Map<number, number>(); // GameObject id → state buffer slot index
    private nextSlot: number = 0;
    private totalCells: number = 0;
    private totalBoundaryPoints: number = 0;
    private readbackInFlight: boolean = false;

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
        this.targets = params.targets;
        this.erasePipeline = erasePipeline;
        this.stampPipeline = stampPipeline;
        this.gameObjectBuffers = gameObjectBuffers;
        this.physicsPass = physicsPass;
        this.collisionPass = collisionPass;
        this.workgroupSize = workgroupSize;
    }

    /** Compiles erase and stamp shaders, creates sub-passes, and returns a ready-to-use pass. @internal */
    public static async Create(params: GameObjectPassParams): Promise<GameObjectPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const gameObjectBuffers = new GameObjectBuffers(params.device);

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
            GameObjectPhysicsPass.Create({ device: params.device, buffers: gameObjectBuffers }),
            GameObjectCollisionPass.Create({ device: params.device, buffers: gameObjectBuffers }),
        ]);

        return new GameObjectPass(
            params, erasePipeline, stampPipeline, gameObjectBuffers, physicsPass, collisionPass, workgroupSize
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
        const slot = this.nextSlot++;
        const cellOffset = this.totalCells;
        const filledCells = pixelData.cells.filter(c => c.materialId !== 0);

        // Build boundary points from the first non-trigger collider found
        const boxCollider = gameObject.GetComponent(BoxCollider);
        const circleCollider = gameObject.GetComponent(CircleCollider);
        const pixelBodyCollider = gameObject.GetComponent(PixelBodyCollider);

        let boundaryOffset = 0;
        let boundaryCount = 0;

        const activeCollider = boxCollider ?? circleCollider ?? pixelBodyCollider;
        if (activeCollider && !activeCollider.isTrigger) {
            let boundaryPoints;
            const { x: pivotX, y: pivotY } = pixelData.pivot;
            if (boxCollider) {
                // Box/circle offsets are pivot-relative; add pivot to match cell.pos space so the
                // shader's pivot subtraction doesn't double-subtract.
                boundaryPoints = ColliderGenerator.BuildBoxBoundary(boxCollider.offset, boxCollider.size)
                    .map(p => ({ x: p.x + pivotX, y: p.y + pivotY }));
            } else if (circleCollider) {
                boundaryPoints = ColliderGenerator.BuildCircleBoundary(circleCollider.offset, circleCollider.radius)
                    .map(p => ({ x: p.x + pivotX, y: p.y + pivotY }));
            } else {
                boundaryPoints = ColliderGenerator.BuildPixelBodyBoundary(pixelData.cells);
            }

            if (boundaryPoints.length > 0) {
                boundaryOffset = this.totalBoundaryPoints;
                boundaryCount = boundaryPoints.length;

                const pointBuf = new ArrayBuffer(boundaryPoints.length * GameObjectColliderSchema.byteStride);
                const pi = new Int32Array(pointBuf);
                for (let i = 0; i < boundaryPoints.length; i++) {
                    pi[i * GameObjectColliderSchema.stride] = boundaryPoints[i].x;
                    pi[i * GameObjectColliderSchema.stride + 1] = -boundaryPoints[i].y; // stored in canvas-Y (0=top); shaders expect sim-Y (0=bottom)
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
        sf[8] = pixelData.pivot.x;
        sf[9] = -pixelData.pivot.y; // stored in canvas-Y (0=top); shaders expect sim-Y (0=bottom)
        su[10] = gameObject.id;
        su[11] = cellOffset;
        su[12] = filledCells.length;
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
        // where dx/dy is each cell's offset from the pivot in local space.
        // Determines how easily the GO rotates under a given torque.
        const pivotX = pixelData.pivot.x;
        const pivotY = pixelData.pivot.y;
        const sumSquaredRadius = filledCells.reduce((acc, c) => {
            const dx = c.pos.x - pivotX;
            const dy = c.pos.y - pivotY;
            return acc + dx * dx + dy * dy;
        }, 0);
        const mass = rigidbody ? rigidbody.mass : 1;
        sf[28] = Math.max(0.001, mass * sumSquaredRadius / Math.max(1, filledCells.length));

        this.device.queue.writeBuffer(
            this.gameObjectBuffers.stateBuffer,
            slot * GameObjectStateSchema.byteStride,
            stateBuf
        );

        // Pack all cells for this GameObject into the flat cell buffer.
        // Material identity (materialId, colorVariant) is permanent and stored here.
        // Dynamic per-cell state (temperature, health, lifetime) is NOT stored here —
        // the stamp pass carries those forward from the simulation textures at the cell's previous position.
        const colorsPerMaterial = MaterialVisualSchema.GetColorsPerMaterial();
        const cellBuf = new ArrayBuffer(filledCells.length * GameObjectCellSchema.byteStride);
        const ci = new Int32Array(cellBuf);
        const cu = new Uint32Array(cellBuf);
        const cf = new Float32Array(cellBuf);

        for (let i = 0; i < filledCells.length; i++) {
            const cell = filledCells[i];
            const base = i * GameObjectCellSchema.stride;
            ci[base] = cell.pos.x;
            ci[base + 1] = -cell.pos.y; // stored in canvas-Y (0=top); shaders expect sim-Y (0=bottom)
            cu[base + 2] = slot;
            cu[base + 3] = gameObject.id;
            cu[base + 4] = cell.materialId;
            cf[base + 5] = (cell.colorVariant + 0.5) / colorsPerMaterial;
        }

        this.device.queue.writeBuffer(
            this.gameObjectBuffers.cellBuffer,
            cellOffset * GameObjectCellSchema.byteStride,
            cellBuf
        );

        this.gameObjectSlots.set(gameObject.id, slot);
        this.totalCells += filledCells.length;
    }

    /** Runs erase, physics, and stamp passes for all active game objects. @internal */
    public Run(params: GameObjectRunParams): void {
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

        const { encoder, gravity, simStepDuration } = params;
        const { targets, device, gameObjectBuffers } = this;

        device.queue.writeBuffer(
            gameObjectBuffers.eraseUniformBuffer, 0,
            new Uint32Array([this.totalCells, targets.width, targets.height, 0])
        );
        device.queue.writeBuffer(
            gameObjectBuffers.stampUniformBuffer, 0,
            new Uint32Array([this.totalCells, targets.width, targets.height, 0])
        );

        // Pass 1: erase — clear previous cell positions from identity and ownership
        const eraseBindGroup = device.createBindGroup({
            layout: this.erasePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: gameObjectBuffers.cellBuffer } },
                { binding: 1, resource: { buffer: gameObjectBuffers.stateBuffer } },
                { binding: 2, resource: { buffer: gameObjectBuffers.eraseUniformBuffer } },
                { binding: 3, resource: targets.currentOwnership.createView() },
                { binding: 4, resource: targets.nextIdentity.createView() },
                { binding: 5, resource: targets.nextOwnership.createView() },
            ],
        });
        const erasePass = encoder.beginComputePass();
        erasePass.setPipeline(this.erasePipeline);
        erasePass.setBindGroup(0, eraseBindGroup);
        erasePass.dispatchWorkgroups(Math.ceil(this.totalCells / this.workgroupSize));
        erasePass.end();

        // Pass 2: physics — save prevPos, integrate velocity, update positions in state buffer
        this.physicsPass.Run({ encoder, gravity, simStepDuration });

        // Pass 3: collision — reflect velocity away from occupied sim cells
        this.collisionPass.Run({ encoder, targets, gravity, simStepDuration });

        // Pass 4: stamp — carry full cell state (identity, physics, state) from prevPos to new pos
        const stampBindGroup = device.createBindGroup({
            layout: this.stampPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: gameObjectBuffers.cellBuffer } },
                { binding: 1, resource: { buffer: gameObjectBuffers.stateBuffer } },
                { binding: 2, resource: { buffer: gameObjectBuffers.stampUniformBuffer } },
                { binding: 3, resource: targets.currentIdentity.createView() },
                { binding: 4, resource: targets.currentOwnership.createView() },
                { binding: 5, resource: targets.nextIdentity.createView() },
                { binding: 6, resource: targets.nextOwnership.createView() },
                { binding: 7, resource: targets.currentPhysics.createView() },
                { binding: 8, resource: targets.nextPhysics.createView() },
                { binding: 9, resource: targets.currentState.createView() },
                { binding: 10, resource: targets.nextState.createView() },
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
            const copySize = this.nextSlot * GameObjectStateSchema.byteStride;
            if (copySize > 0) {
                encoder.copyBufferToBuffer(
                    gameObjectBuffers.stateBuffer, 0,
                    gameObjectBuffers.stateReadbackBuffer, 0,
                    copySize
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

        const { stateReadbackBuffer } = this.gameObjectBuffers;
        await stateReadbackBuffer.mapAsync(GPUMapMode.READ);

        const mappedRange = stateReadbackBuffer.getMappedRange(0, this.nextSlot * GameObjectStateSchema.byteStride);
        const dataF32 = new Float32Array(mappedRange);
        const dataU32 = new Uint32Array(mappedRange);

        for (const [gameObjectId, slot] of this.gameObjectSlots) {
            const base = slot * GameObjectStateSchema.stride;
            const gameObject = GameObjectManager.Instance?.Get(gameObjectId);
            if (!gameObject) { continue; }

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
        this.readbackInFlight = false;
    }

    public OnDestroy(): void {
        this.gameObjectBuffers.OnDestroy();
    }
}
