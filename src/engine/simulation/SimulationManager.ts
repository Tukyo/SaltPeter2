import type { Size2D } from '../definitions/Primitives';

import { Renderer } from '../rendering/Renderer';

import { PhysicsConfig } from '../config/PhysicsConfig';
import { SimulationConfig } from '../config/SimulationConfig';

import { Analytics } from '../debug/Analytics';
import { AnalyticsPass } from '../debug/AnalyticsPass';
import { LogManager } from '../debug/LogManager';
import { DiffusionPass } from './DiffusionPass';
import { IntentPass } from './IntentPass';
import { PhysicsPass } from './PhysicsPass';

import { GameObjectBuffers } from '../game_object/GameObjectBuffers';
import { GameObjectPass } from '../game_object/GameObjectPass';
import { GameObjectLayer } from '../game_object/GameObjectLayer';

import { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import { MaterialStateBuffer } from '../materials/MaterialStateBuffer';
import { MaterialVisualBuffer } from '../materials/MaterialVisualBuffer';
import { MaterialSimulationBuffer } from '../materials/MaterialSimulationBuffer';

import { NitrateProcess } from '../NitrateProcess';
import { Time } from '../time/Time';

import { ReactionLookupBuffer } from '../materials/ReactionLookupBuffer';

import { SimulationClock } from './SimulationClock';
import { SimulationInitializer } from './SimulationInitializer';
import { SimulationLayer } from './SimulationLayer';
import { SimulationPass } from './SimulationPass';
import { SimulationState } from './SimulationState';
import { SimulationTexture } from './SimulationTexture';

import { TexturePixelReader } from '../rendering/TexturePixelReader';

import { Chunk } from '../world/chunk/Chunk';
import { ChunkManager } from '../world/chunk/ChunkManager';
import { World } from '../world/World';

import { ParticleBuffer } from '../particle/ParticleBuffer';
import { ParticleDefinitionBuffer } from '../particle/ParticleDefinitionBuffer';
import { ParticleEmitterBuffer } from '../particle/ParticleEmitterBuffer';
import { ParticleSourceLookupBuffer } from '../particle/ParticleSourceLookupBuffer';
import { ParticleEmissionPass } from '../particle/ParticleEmissionPass';
import { ParticleSimulationPass } from '../particle/ParticleSimulationPass';
import { GameObjectManager } from '../game_object/GameObjectManager';
import { ParticleSystem } from '../component/definitions/particlesystem/ParticleSystem';
import { Transform } from '../component/definitions/transform/Transform';

/** A resource that is managed by the SimulationManager. @internal */
export interface SimulationResource { Destroy(): void }

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

    public simulationLayer: SimulationLayer | null = null;
    public gameObjectLayer: GameObjectLayer | null = null;
    public intent: SimulationTexture | null = null;
    public texturePixelReader: TexturePixelReader | null = null;

    public gameObjectBuffers: GameObjectBuffers | null = null;
    public materialPhysicsBuffer: MaterialPhysicsBuffer | null = null;
    public materialSimBuffer: MaterialSimulationBuffer | null = null;
    public materialStateBuffer: MaterialStateBuffer | null = null;
    public materialVisualBuffer: MaterialVisualBuffer | null = null;
    public particleBuffer: ParticleBuffer | null = null;
    public particleDefinitionBuffer: ParticleDefinitionBuffer | null = null;
    public particleEmitterBuffer: ParticleEmitterBuffer | null = null;
    public particleSourceLookupBuffer: ParticleSourceLookupBuffer | null = null;
    public particleEmissionPass: ParticleEmissionPass | null = null;
    public particleSimulationPass: ParticleSimulationPass | null = null;
    public reactionBuffer: ReactionLookupBuffer | null = null;

    public simAnalyticsPass: AnalyticsPass | null = null;
    public goAnalyticsPass: AnalyticsPass | null = null;
    public diffusionPass: DiffusionPass | null = null;
    public gameObjectPass: GameObjectPass | null = null;
    public intentPass: IntentPass | null = null;
    public physicsPass: PhysicsPass | null = null;
    public simPass: SimulationPass | null = null;

    public readonly state: SimulationState = new SimulationState();

    private clock: SimulationClock = new SimulationClock();
    private debounceCountdown: number = 0;

    private readonly processes: SimulationResource[] = [];

    private RegisterResource<T extends SimulationResource>(process: T): T {
        this.processes.push(process);
        LogManager.Instance?.Log({
            text: `Registered process: ${process.constructor.name}`,
            options: { tags: ['Sim', 'PassRegistry'] }
        });
        return process;
    }

    constructor() {
        super();
        this.Register();
        
        SimulationManager.Instance = this;
    }

    /** Pauses the simulation for n frames. */
    public Debounce(frames: number): void { this.debounceCountdown = frames; }

    public Awake(): void {
        if (!this.enabled || this.simulationLayer) { return; }
        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!webgpu) { return; }
        LogManager.Instance?.Log({
            text: 'SimulationManager awake.',
            options: { tags: ['Sim', 'NitrateProcessInit'] }
        });
        const scale = this.state.GetResolutionScale();
        const size: Size2D = World.Instance
            ? {
                width: Chunk.GetSimWidth(Math.floor(webgpu.canvas.width * scale)),
                height: Chunk.GetSimHeight(Math.floor(webgpu.canvas.height * scale))
            }
            : this.state.ComputeSimSize({ width: webgpu.canvas.width, height: webgpu.canvas.height });
        this.InitializeSimulation(size);
    }

    public Update(): void {
        if (this.debounceCountdown > 0) { this.debounceCountdown--; return; }
        this.Simulate();
    }

    /** Allocates all passes, textures, and material buffers for the given size, then emits the init event. @internal */
    private async InitializeSimulation(size: Size2D): Promise<void> {
        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!webgpu) { return; }
        const { device } = webgpu;
        const { width, height } = size;

        this.simulationLayer = this.RegisterResource(new SimulationLayer(device, width, height));
        this.gameObjectLayer = this.RegisterResource(new GameObjectLayer(device, width, height));

        new SimulationInitializer(device, this.simulationLayer, this.gameObjectLayer);

        if (this.simulationLayer && World.Instance) {
            await ChunkManager.Instance?.InitializeChunks(device, this.simulationLayer, size);
        }

        this.gameObjectBuffers = this.RegisterResource(new GameObjectBuffers(device));
        this.intent = this.RegisterResource(new SimulationTexture(device, size));
        this.texturePixelReader = this.RegisterResource(new TexturePixelReader(device));
        this.materialPhysicsBuffer = this.RegisterResource(new MaterialPhysicsBuffer(device));
        this.materialStateBuffer = this.RegisterResource(new MaterialStateBuffer(device));
        this.materialVisualBuffer = this.RegisterResource(new MaterialVisualBuffer(device));
        this.materialSimBuffer = this.RegisterResource(new MaterialSimulationBuffer(device));
        this.reactionBuffer = this.RegisterResource(new ReactionLookupBuffer(device));
        this.particleBuffer = this.RegisterResource(new ParticleBuffer(device));
        this.particleDefinitionBuffer = this.RegisterResource(new ParticleDefinitionBuffer(device));
        this.particleEmitterBuffer = this.RegisterResource(new ParticleEmitterBuffer(device));
        this.particleSourceLookupBuffer = this.RegisterResource(new ParticleSourceLookupBuffer(device));

        const [
            intentPass, simPass, diffusionPass, physicsPass, gameObjectPass,
            particleEmissionPass, particleSimulationPass, simAnalyticsPass, goAnalyticsPass
        ] = await Promise.all([
            IntentPass.Create({
                device,
                simulationLayer: this.simulationLayer,
                intent: this.intent,
                physicsBuffer: this.materialPhysicsBuffer,
                simBuffer: this.materialSimBuffer,
                reactionBuffer: this.reactionBuffer
            }),
            SimulationPass.Create({
                device,
                simulationLayer: this.simulationLayer,
                gameObjectLayer: this.gameObjectLayer,
                intent: this.intent,
                physicsBuffer: this.materialPhysicsBuffer,
                simBuffer: this.materialSimBuffer,
                stateBuffer: this.materialStateBuffer,
                reactionBuffer: this.reactionBuffer
            }),
            DiffusionPass.Create({
                device,
                simulationLayer: this.simulationLayer,
                physicsBuffer: this.materialPhysicsBuffer
            }),
            PhysicsPass.Create({
                device,
                simulationLayer: this.simulationLayer,
                gameObjectLayer: this.gameObjectLayer,
                physicsBuffer: this.materialPhysicsBuffer,
                goStateBuffer: this.gameObjectBuffers.stateBuffer,
            }),
            GameObjectPass.Create({
                device,
                simulationLayer: this.simulationLayer,
                gameObjectLayer: this.gameObjectLayer,
                physicsBuffer: this.materialPhysicsBuffer,
                stateBuffer: this.materialStateBuffer,
                reactionBuffer: this.reactionBuffer,
                gameObjectBuffers: this.gameObjectBuffers,
                particleDefinitionBuffer: this.particleDefinitionBuffer,
            }),
            ParticleEmissionPass.Create({
                device,
                simulationLayer: this.simulationLayer,
                particleBuffer: this.particleBuffer,
                particleSourceLookupBuffer: this.particleSourceLookupBuffer,
                particleDefinitionBuffer: this.particleDefinitionBuffer,
                particleEmitterBuffer: this.particleEmitterBuffer,
            }),
            ParticleSimulationPass.Create({
                device,
                particleBuffer: this.particleBuffer,
                particleDefinitionBuffer: this.particleDefinitionBuffer,
                simulationLayer: this.simulationLayer,
            }),
            AnalyticsPass.Create(device),
            AnalyticsPass.Create(device),
        ]);

        this.intentPass = this.RegisterResource(intentPass);
        this.simPass = this.RegisterResource(simPass);
        this.diffusionPass = this.RegisterResource(diffusionPass);
        this.physicsPass = this.RegisterResource(physicsPass);
        this.simAnalyticsPass = this.RegisterResource(simAnalyticsPass);
        this.goAnalyticsPass = this.RegisterResource(goAnalyticsPass);
        this.gameObjectPass = this.RegisterResource(gameObjectPass);
        this.particleEmissionPass = this.RegisterResource(particleEmissionPass);
        this.particleSimulationPass = this.RegisterResource(particleSimulationPass);

        Analytics.Init(simAnalyticsPass, goAnalyticsPass);

        SimulationManager.Instance = this;

        LogManager.Instance?.Log({
            text: 'Simulation ready.',
            options: { tags: ['Sim', 'NitrateProcessInit'] }
        });
        this.EmitInit();
    }

    /** Dispatches all simulation passes for the current frame. Returns step counts for profiling. @internal */
    public Simulate(): { simulationSteps: number; physicsSteps: number } {
        const {
            simulationLayer, gameObjectLayer, intentPass, simPass, diffusionPass,
            physicsPass, gameObjectPass, particleEmissionPass, particleSimulationPass,
            particleEmitterBuffer,
        } = this;
        const webgpu = Renderer.Instance?.GetWebGPU();

        if (
            !simulationLayer || !gameObjectLayer || !intentPass || !simPass ||
            !diffusionPass || !physicsPass || !gameObjectPass ||
            !particleEmissionPass || !particleSimulationPass || !particleEmitterBuffer || !webgpu
        ) {
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
            : this.clock.Update(Time.now * 0.001, { gravity, simSpeed: state.GetSimSpeed() });

        let physicsSteps = 0;

        for (let i = 0; i < stepInfo.simulationSteps; i++) {
            const simStepDuration = 1 / baseTickRate;
            state.SetSimTime(state.GetSimTime() + simStepDuration);

            const encSim = device.createCommandEncoder();
            intentPass.Run({ encoder: encSim, time: state.GetSimTime(), gravity });
            simPass.Run({ encoder: encSim, time: state.GetSimTime(), gravity });
            device.queue.submit([encSim.finish()]);

            const encErase = device.createCommandEncoder();
            gameObjectPass.RunErase({ encoder: encErase, gravity, simStepDuration, time: state.GetSimTime() });
            device.queue.submit([encErase.finish()]);

            const encGameObjects = device.createCommandEncoder();
            gameObjectPass.RunStamp({ encoder: encGameObjects, gravity, simStepDuration, time: state.GetSimTime() });
            device.queue.submit([encGameObjects.finish()]);
            gameObjectPass.ReadbackPositions();

            simulationLayer.SwapIdentity();
            simulationLayer.SwapPhysics();
            simulationLayer.SwapState();
            gameObjectLayer.SwapIdentity();
            gameObjectLayer.SwapPhysics();
            gameObjectLayer.SwapState();
            gameObjectLayer.SwapOwnership();

            const diffEnc = device.createCommandEncoder();
            diffusionPass.Run(diffEnc, state.GetSimStepCount() % 2);
            device.queue.submit([diffEnc.finish()]);
            simulationLayer.SwapIdentity();
            simulationLayer.SwapPhysics();
            state.SetSimStepCount(state.GetSimStepCount() + 1);

            const emitters = [];
            for (const go of GameObjectManager.Instance?.GetAll() ?? []) {
                const particleSystem = go.GetComponent(ParticleSystem);
                const goTransform = go.GetComponent(Transform);
                if (particleSystem && goTransform && particleSystem.runtimeSlot >= 0) {
                    const { main } = particleSystem.particle;
                    emitters.push({
                        id: particleSystem.runtimeSlot,
                        pos: goTransform.position,
                        delay: main.start.delay ?? 0,
                        duration: main.duration,
                        loop: main.loop,
                    });
                }
            }
            particleEmitterBuffer.Update(device, emitters, state.GetSimTime());

            const particleEnc = device.createCommandEncoder();
            particleEmissionPass.Run({ encoder: particleEnc, time: state.GetSimTime(), deltaTime: simStepDuration });
            particleSimulationPass.Run(particleEnc, simStepDuration, state.GetSimTime());
            device.queue.submit([particleEnc.finish()]);

            state.SetPhysicsTickCounter(state.GetPhysicsTickCounter() + 1);
            if (state.GetPhysicsTickCounter() >= physicsInterval) {
                state.SetPhysicsTickCounter(0);
                const physicsEnc = device.createCommandEncoder();
                physicsPass.Run(physicsEnc, gravity);
                device.queue.submit([physicsEnc.finish()]);
                simulationLayer.SwapPhysics();
                gameObjectLayer.SwapPhysics();
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
            options: { tags: ['Resize', 'Sim'] }
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
        this.InitializeSimulation(size);
    }

    /** Destroys every registered {@link SimulationResource} and nulls all used variables. @internal */
    public OnDestroy(): void {
        for (const p of this.processes) p.Destroy?.();
        this.processes.length = 0;

        this.simulationLayer = null;
        this.gameObjectLayer = null;
        this.gameObjectBuffers = null;
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
        this.simAnalyticsPass = null;
        this.goAnalyticsPass = null;
        this.particleBuffer = null;
        this.particleDefinitionBuffer = null;
        this.particleEmitterBuffer = null;
        this.particleSourceLookupBuffer = null;
        this.particleEmissionPass = null;
        this.particleSimulationPass = null;

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
