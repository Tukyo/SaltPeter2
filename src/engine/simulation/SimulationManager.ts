import type { Size2D } from '../definitions/Primitives';

import { Renderer } from '../rendering/Renderer';

import { PhysicsConfig } from '../config/PhysicsConfig';
import { SimulationConfig } from '../config/SimulationConfig';

import { Analytics } from '../debug/Analytics';
import { AnalyticsPass } from '../debug/AnalyticsPass';
import { LogManager } from '../debug/LogManager';
import { DiffusionPass } from './DiffusionPass';
import { GameObjectPass } from '../game_object/GameObjectPass';
import { IntentPass } from './IntentPass';
import { PhysicsPass } from './PhysicsPass';

import { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import { MaterialStateBuffer } from '../materials/MaterialStateBuffer';
import { MaterialVisualBuffer } from '../materials/MaterialVisualBuffer';
import { MaterialSimulationBuffer } from '../materials/MaterialSimulationBuffer';

import { NitrateProcess } from '../NitrateProcess';

import { PingPongTargets } from './PingPongTargets';
import { ReactionLookupBuffer } from '../materials/ReactionLookupBuffer';

import { SimulationClock } from './SimulationClock';
import { SimulationInitializer } from './SimulationInitializer';
import { SimulationPass } from './SimulationPass';
import { SimulationState } from './SimulationState';
import { SimulationTexture } from './SimulationTexture';

import { TexturePixelReader } from '../rendering/TexturePixelReader';

import { Chunk } from '../world/chunk/Chunk';
import { ChunkManager } from '../world/chunk/ChunkManager';
import { World } from '../world/World';

/**
 * Central coordinator for the GPU simulation pipeline.
 *
 * On `Start`, allocates all ping-pong textures, material buffers, and GPU compute passes,
 * then emits the init event so dependent systems can bind.
 * 
 * Each frame, `Update` drives the fixed-timestep clock and dispatches intent,
 * simulation, diffusion, and physics passes in order.
 *
 * ```ts
 * new Nitrate.SimulationManager();
 * ```
 */
export class SimulationManager extends NitrateProcess {
    public static Instance: SimulationManager | null = null;

    public pingPong: PingPongTargets | null = null;
    public intent: SimulationTexture | null = null;
    public texturePixelReader: TexturePixelReader | null = null;

    public materialPhysicsBuffer: MaterialPhysicsBuffer | null = null;
    public materialSimBuffer: MaterialSimulationBuffer | null = null;
    public materialStateBuffer: MaterialStateBuffer | null = null;
    public materialVisualBuffer: MaterialVisualBuffer | null = null;
    public reactionBuffer: ReactionLookupBuffer | null = null;

    public analyticsPass: AnalyticsPass | null = null;
    public diffusionPass: DiffusionPass | null = null;
    public gameObjectPass: GameObjectPass | null = null;
    public intentPass: IntentPass | null = null;
    public physicsPass: PhysicsPass | null = null;
    public simPass: SimulationPass | null = null;

    public readonly state: SimulationState = new SimulationState();

    private clock: SimulationClock = new SimulationClock();
    private blocked: boolean = false;
    private debounceCountdown: number = 0;

    private readonly processes: { OnDestroy?(): void }[] = [];

    private Register<T extends { OnDestroy?(): void }>(process: T): T {
        this.processes.push(process);
        LogManager.Instance?.Log({
            text: `Registered process: ${process.constructor.name}`,
            options: { tags: ['Sim', 'PassRegistry'] }
        });
        return process;
    }

    constructor() {
        super();
        SimulationManager.Instance = this;
    }


    /** Prevents the simulation from starting or ticking. Call Unblock() to resume. */
    public Block(): void {
        this.blocked = true;
        LogManager.Instance?.Log({
            text: 'SimulationManager blocked.',
            options: { tags: ['Sim'] }
        });
    }
    /** Resumes the simulation after a Block() call. */
    public Unblock(): void {
        this.blocked = false;
        LogManager.Instance?.Log({
            text: 'SimulationManager unblocked.',
            options: { tags: ['Sim'] }
        });
    }

    /** Pauses the simulation for n frames. */
    public Debounce(frames: number): void { this.debounceCountdown = frames; }

    public Start(): void {
        if (this.blocked || this.pingPong) { return; }
        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!webgpu) { return; }
        LogManager.Instance?.Log({
            text: 'SimulationManager start.',
            options: { tags: ['Sim', 'NitrateProcessInit'] }
        });
        const scale = this.state.GetResolutionScale();
        const size: Size2D = World.Instance
            ? {
                width: Chunk.GetSimWidth(Math.floor(webgpu.canvas.width * scale)),
                height: Chunk.GetSimHeight(Math.floor(webgpu.canvas.height * scale))
            }
            : this.state.ComputeSimSize({ width: webgpu.canvas.width, height: webgpu.canvas.height });
        this.Init(size);
    }

    public Update(now: number): void {
        if (this.blocked) { return; }
        if (this.debounceCountdown > 0) { this.debounceCountdown--; return; }
        this.Simulate(now);
    }

    /** Allocates all passes, textures, and material buffers for the given size, then emits the init event. @internal */
    public async Init(size: Size2D): Promise<void> {
        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!webgpu) { return; }
        const { device } = webgpu;
        const { width, height } = size;

        this.pingPong = this.Register(new PingPongTargets(device, width, height));

        new SimulationInitializer(device, this.pingPong);

        if (this.pingPong && World.Instance) {
            await ChunkManager.Instance?.InitializeChunks(device, this.pingPong, size);
        }

        this.intent = this.Register(new SimulationTexture(device, size));
        this.texturePixelReader = this.Register(new TexturePixelReader(device));
        this.materialPhysicsBuffer = this.Register(new MaterialPhysicsBuffer(device));
        this.materialStateBuffer = this.Register(new MaterialStateBuffer(device));
        this.materialVisualBuffer = this.Register(new MaterialVisualBuffer(device));
        this.materialSimBuffer = this.Register(new MaterialSimulationBuffer(device));
        this.reactionBuffer = this.Register(new ReactionLookupBuffer(device));

        const [intentPass, simPass, diffusionPass, physicsPass, analyticsPass, gameObjectPass]
            = await Promise.all([
                IntentPass.Create({
                    device,
                    targets: this.pingPong,
                    intent: this.intent,
                    physicsBuffer: this.materialPhysicsBuffer,
                    simBuffer: this.materialSimBuffer,
                    reactionBuffer: this.reactionBuffer
                }),
                SimulationPass.Create({
                    device,
                    targets: this.pingPong,
                    intent: this.intent,
                    physicsBuffer: this.materialPhysicsBuffer,
                    simBuffer: this.materialSimBuffer,
                    stateBuffer: this.materialStateBuffer,
                    reactionBuffer: this.reactionBuffer
                }),
                DiffusionPass.Create({
                    device,
                    targets: this.pingPong,
                    physicsBuffer: this.materialPhysicsBuffer
                }),
                PhysicsPass.Create({
                    device,
                    targets: this.pingPong,
                    physicsBuffer: this.materialPhysicsBuffer
                }),
                AnalyticsPass.Create(device),
                GameObjectPass.Create({ device, targets: this.pingPong }),
            ]);

        this.intentPass = this.Register(intentPass);
        this.simPass = this.Register(simPass);
        this.diffusionPass = this.Register(diffusionPass);
        this.physicsPass = this.Register(physicsPass);
        this.analyticsPass = this.Register(analyticsPass);
        this.gameObjectPass = this.Register(gameObjectPass);

        Analytics.Init(this.analyticsPass);
        SimulationManager.Instance = this;

        LogManager.Instance?.Log({
            text: 'Simulation ready.',
            options: { tags: ['Sim', 'NitrateProcessInit'] }
        });
        this.EmitInit();
    }

    /** Dispatches all simulation passes for the current frame. Returns step counts for profiling. @internal */
    public Simulate(now: number): { simulationSteps: number; physicsSteps: number } {
        const { pingPong, intentPass, simPass, diffusionPass, physicsPass, gameObjectPass } = this;
        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!pingPong || !intentPass || !simPass || !diffusionPass || !physicsPass || !gameObjectPass || !webgpu) {
            return { simulationSteps: 0, physicsSteps: 0 };
        }

        const physicsConfig = PhysicsConfig.GetConfig();
        const simConfig = SimulationConfig.GetConfig();
        const gravity = physicsConfig.general.gravity;
        const physicsInterval = physicsConfig.general.interval;
        const baseTickRate = simConfig.time.baseTickRate;

        const { state } = this;
        const { device } = webgpu;

        const stepInfo = state.GetPaused()
            ? { simulationSteps: 0 }
            : this.clock.Update(now * 0.001, { gravity, simSpeed: state.GetSimSpeed() });

        let physicsSteps = 0;

        for (let i = 0; i < stepInfo.simulationSteps; i++) {
            const simStepDuration = 1 / baseTickRate;
            state.SetSimTime(state.GetSimTime() + simStepDuration);

            const enc = device.createCommandEncoder();
            intentPass.Run({ encoder: enc, time: state.GetSimTime(), gravity });
            simPass.Run({ encoder: enc, time: state.GetSimTime(), gravity });
            gameObjectPass.Run({ encoder: enc, gravity, simStepDuration });
            device.queue.submit([enc.finish()]);
            gameObjectPass.ReadbackPositions();
            pingPong.SwapIdentity();
            pingPong.SwapPhysics();
            pingPong.SwapState();
            pingPong.SwapOwnership();

            const diffEnc = device.createCommandEncoder();
            diffusionPass.Run(diffEnc, state.GetSimStepCount() % 2);
            device.queue.submit([diffEnc.finish()]);
            pingPong.SwapIdentity();
            pingPong.SwapPhysics();
            state.SetSimStepCount(state.GetSimStepCount() + 1);

            state.SetPhysicsTickCounter(state.GetPhysicsTickCounter() + 1);
            if (state.GetPhysicsTickCounter() >= physicsInterval) {
                state.SetPhysicsTickCounter(0);
                const physicsEnc = device.createCommandEncoder();
                physicsPass.Run(physicsEnc, gravity);
                device.queue.submit([physicsEnc.finish()]);
                pingPong.SwapPhysics();
                physicsSteps++;
            }
        }

        state.SetLastTickSimulationSteps(stepInfo.simulationSteps);
        state.SetLastTickPhysicsSteps(physicsSteps);

        return { simulationSteps: stepInfo.simulationSteps, physicsSteps };
    }

    public OnResize(): void {
        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!webgpu) { return; }
        LogManager.Instance?.Log({
            text: 'Simulation OnResize.',
            options: { tags: ['Sim'] }
        });

        this.state.Reset();
        this.clock = new SimulationClock();

        const scale = this.state.GetResolutionScale();
        const size: Size2D = World.Instance
            ? {
                width: Chunk.GetSimWidth(Math.floor(webgpu.canvas.width * scale)),
                height: Chunk.GetSimHeight(Math.floor(webgpu.canvas.height * scale))
            }
            : this.state.ComputeSimSize({ width: webgpu.canvas.width, height: webgpu.canvas.height });

        this.OnDestroy();
        this.Init(size);
    }

    public OnDestroy(): void {
        for (const p of this.processes) p.OnDestroy?.();
        this.processes.length = 0;

        this.pingPong = null;
        this.intent = null;
        this.texturePixelReader = null;
        this.materialPhysicsBuffer = null;
        this.materialStateBuffer = null;
        this.materialVisualBuffer = null;
        this.materialSimBuffer = null;
        this.reactionBuffer = null;
        this.intentPass = null;
        this.simPass = null;
        this.diffusionPass = null;
        this.gameObjectPass = null;
        this.physicsPass = null;
        this.analyticsPass = null;

        Analytics.Reset();

        if (SimulationManager.Instance === this) {
            SimulationManager.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared SimulationManager singleton instance.',
                options: { tags: ['Sim', 'NitrateProcessDestroy'] }
            });
        }
    }
}
