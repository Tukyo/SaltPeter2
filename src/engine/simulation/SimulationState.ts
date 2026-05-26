import type { Size2D } from "../definitions/Primitives";
import { LogManager } from "../debug/LogManager";

/**
 * Runtime state container for the simulation, accessible via {@link SimulationManager.state}.
 *
 * Holds pause state, sim speed, resolution settings, and per-frame step counts.
 * 
 * UI panels and external callers read and write through this — the manager itself
 * uses it for clock scheduling and pass dispatch.
 */
export class SimulationState {
    private simTime: number = 0;
    /** Returns the accumulated simulation time in seconds. */
    public GetSimTime(): number { return this.simTime; }
    /** Sets the accumulated simulation time in seconds. */
    // @omitfromdocs
    public SetSimTime(value: number): void {
        this.simTime = value;
        LogManager.Instance?.Log({ text: `simTime → ${value}`, options: { tags: ['Sim'], noisy: true } });
    }

    private simStepCount: number = 0;
    /** Returns the total number of simulation steps executed. */
    public GetSimStepCount(): number { return this.simStepCount; }
    /** Sets the total simulation step count. */
    // @omitfromdocs
    public SetSimStepCount(value: number): void {
        this.simStepCount = value;
        LogManager.Instance?.Log({ text: `simStepCount → ${value}`, options: { tags: ['Sim'], noisy: true } });
    }

    private physicsTickCounter: number = 0;
    /** Returns the current physics interval tick counter. */
    public GetPhysicsTickCounter(): number { return this.physicsTickCounter; }
    /** Sets the physics interval tick counter. */
    // @omitfromdocs
    public SetPhysicsTickCounter(value: number): void {
        this.physicsTickCounter = value;
        LogManager.Instance?.Log({ text: `physicsTickCounter → ${value}`, options: { tags: ['Sim'], noisy: true } });
    }

    private lastTickSimulationSteps: number = 0;
    /** Returns the number of simulation steps that ran last frame. */
    public GetLastTickSimulationSteps(): number { return this.lastTickSimulationSteps; }
    /** Sets the number of simulation steps that ran last frame. */
    // @omitfromdocs
    public SetLastTickSimulationSteps(value: number): void {
        this.lastTickSimulationSteps = value;
        LogManager.Instance?.Log({ text: `lastTickSimulationSteps → ${value}`, options: { tags: ['Sim'], noisy: true } });
    }

    private lastTickPhysicsSteps: number = 0;
    /** Returns the number of physics steps that ran last frame. */
    public GetLastTickPhysicsSteps(): number { return this.lastTickPhysicsSteps; }
    /** Sets the number of physics steps that ran last frame. */
    // @omitfromdocs
    public SetLastTickPhysicsSteps(value: number): void {
        this.lastTickPhysicsSteps = value;
        LogManager.Instance?.Log({ text: `lastTickPhysicsSteps → ${value}`, options: { tags: ['Sim'], noisy: true } });
    }

    private paused: boolean = false;
    /** Returns whether the simulation is currently paused. */
    public GetPaused(): boolean { return this.paused; }
    /** Pauses or unpauses the simulation. */
    public SetPaused(value: boolean): void {
        this.paused = value;
        LogManager.Instance?.Log({ text: `paused → ${value}`, options: { tags: ['Sim'] } });
    }

    private simSpeed: number = 1.0;
    /** Returns the current simulation speed multiplier. */
    public GetSimSpeed(): number { return this.simSpeed; }
    /** Sets the simulation speed multiplier. */
    public SetSimSpeed(value: number): void {
        this.simSpeed = value;
        LogManager.Instance?.Log({ text: `simSpeed → ${value}`, options: { tags: ['Sim'] } });
    }

    private resolution: number = 0;
    /** Returns the current resolution cap in pixels (0 = native). */
    public GetResolution(): number { return this.resolution; }
    /** Sets the resolution cap in pixels (0 = native). */
    public SetResolution(value: number): void {
        this.resolution = value;
        LogManager.Instance?.Log({ text: `resolution → ${value}`, options: { tags: ['Sim'] } });
    }

    private resolutionScale: number = 1.0;
    /** Returns the current resolution scale factor (0–1). */
    public GetResolutionScale(): number { return this.resolutionScale; }
    /** Sets the resolution scale factor (0–1). */
    public SetResolutionScale(value: number): void {
        this.resolutionScale = value;
        LogManager.Instance?.Log({ text: `resolutionScale → ${value}`, options: { tags: ['Sim'] } });
    }

    /** Resets all tick counters and sim time. Called by {@link SimulationManager} on resize. @internal */
    public Reset(): void {
        this.simTime = 0;
        this.simStepCount = 0;
        this.physicsTickCounter = 0;
        this.lastTickSimulationSteps = 0;
        this.lastTickPhysicsSteps = 0;
    }

    /** Derives simulation pixel dimensions from canvas size, applying resolution cap and scale. @internal */
    public ComputeSimSize(size: Size2D): Size2D {
        const nativeW = Math.max(1, Math.floor(size.width));
        const nativeH = Math.max(1, Math.floor(size.height));
        const baseH = this.resolution > 0 ? Math.min(nativeH, this.resolution) : nativeH;
        const scale = Math.max(0.01, Math.min(1.0, this.resolutionScale));
        const scaledH = Math.max(1, Math.min(nativeH, Math.round(baseH * scale)));
        const scaledW = Math.max(1, Math.min(nativeW, Math.round(scaledH * (nativeW / nativeH))));
        LogManager.Instance?.Log({
            text: `ComputeSimSize: canvas ${nativeW}x${nativeH} → ${scaledW}x${scaledH}`,
            options: { tags: ['Sim'] }
        });
        return { width: scaledW, height: scaledH };
    }
}
