// Assembles complete WGSL programs for each pass by combining ShaderFactory fragments with raw shader sources.
// Does not generate fragments or manage GPU resources — owned entirely by pass constructors.

import { ShaderFactory } from './ShaderFactory';
import {
    analyticsWgsl,
    commonWgsl,
    gameObjectCollisionWgsl,
    gameObjectEraseWgsl,
    gameObjectPhysicsWgsl,
    gameObjectStampWgsl,
    instantiateCellWgsl,
    compositeWgsl,
    diffusionWgsl,
    gameObjectRenderWgsl,
    simRenderWgsl,
    displacementWgsl,
    displayWgsl,
    fireSimulationWgsl,
    fireIntentWgsl,
    fireResolutionWgsl,
    gasIntentWgsl,
    gasResolutionWgsl,
    gasSimulationWgsl,
    identityQueriesWgsl,
    identityWgsl,
    intentHelpersWgsl,
    intentReadWgsl,
    intentWgsl,
    liquidIntentWgsl,
    liquidResolutionWgsl,
    liquidSimulationWgsl,
    phaseIntentWgsl,
    phaseResolutionWgsl,
    phaseWgsl,
    physicsWgsl,
    powderIntentWgsl,
    powderQueriesWgsl,
    powderResolutionWgsl,
    powderSimulationWgsl,
    powderTargetingWgsl,
    pressurePropagationWgsl,
    velocityPropagationWgsl,
    reactionsWgsl,
    simWgsl,
    solidIntentWgsl,
    solidResolutionWgsl,
    solidSimulationWgsl,
    temperaturePropagationWgsl,
    transitionsWgsl,
    brushOutputWgsl,
    brushWgsl,
    particleGameObjectEmitterWgsl,
    particleSharedWgsl,
    particleSubEmitterWgsl,
    particleSpawnWgsl,
    particleMaterialEmitterWgsl,
    particleSimulationWgsl,
    particleRenderWgsl,
} from './Shaders';

/**
 * Assembles complete WGSL programs for each simulation pass.
 *
 * Combines {@link ShaderFactory} generated fragments with raw WGSL source files into
 * full shader strings, one method per pass. Called by pass constructors — not intended
 * for direct use.
 */
export class ShaderAssembler {
    //#region SIMULATION
    // @omitfromdocs
    public static Intent(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateMaterialCount(),
            ShaderFactory.GenerateMaterialPhaseConstants(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateMaxDensity(),
            ShaderFactory.GenerateVelocityConstants(),
            ShaderFactory.GenerateSimFloatsPerMaterial(),
            ShaderFactory.GenerateMaterialPhysicsEntryStruct(),
            ShaderFactory.GenerateIntentConstants(),
            ShaderFactory.GenerateTagConstants(),
            ShaderFactory.GenerateSolidSimulationStruct(),
            ShaderFactory.GeneratePowderSimulationStruct(),
            ShaderFactory.GenerateLiquidSimulationStruct(),
            ShaderFactory.GenerateGasSimulationStruct(),
            ShaderFactory.GenerateFireSimulationStruct(),
            ShaderFactory.GenerateIntentUniformStruct(),
            ShaderFactory.GenerateReactionConstants(),
            ShaderFactory.GenerateNoiseConstants(),
            commonWgsl,
            identityWgsl,
            identityQueriesWgsl,
            intentHelpersWgsl,
            displacementWgsl,
            phaseWgsl,
            solidSimulationWgsl,
            powderSimulationWgsl,
            powderQueriesWgsl,
            powderTargetingWgsl,
            powderIntentWgsl,
            liquidSimulationWgsl,
            gasSimulationWgsl,
            fireSimulationWgsl,
            solidIntentWgsl,
            liquidIntentWgsl,
            gasIntentWgsl,
            fireIntentWgsl,
            phaseIntentWgsl,
            intentWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static Simulation(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateMaterialCount(),
            ShaderFactory.GenerateMaterialPhaseConstants(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateMaxDensity(),
            ShaderFactory.GenerateVelocityConstants(),
            ShaderFactory.GenerateSimFloatsPerMaterial(),
            ShaderFactory.GenerateMaterialPhysicsEntryStruct(),
            ShaderFactory.GenerateMaterialStateEntryStruct(),
            ShaderFactory.GenerateMaterialStateIndexHelper(),
            ShaderFactory.GenerateIntentConstants(),
            ShaderFactory.GenerateSolidSimulationStruct(),
            ShaderFactory.GeneratePowderSimulationStruct(),
            ShaderFactory.GenerateLiquidSimulationStruct(),
            ShaderFactory.GenerateGasSimulationStruct(),
            ShaderFactory.GenerateFireSimulationStruct(),
            ShaderFactory.GenerateSimUniformStruct(),
            ShaderFactory.GenerateReactionConstants(),
            ShaderFactory.GenerateTagConstants(),
            commonWgsl,
            identityWgsl,
            identityQueriesWgsl,
            intentHelpersWgsl,
            displacementWgsl,
            intentReadWgsl,
            phaseWgsl,
            solidSimulationWgsl,
            powderSimulationWgsl,
            liquidSimulationWgsl,
            gasSimulationWgsl,
            fireSimulationWgsl,
            solidResolutionWgsl,
            powderResolutionWgsl,
            liquidResolutionWgsl,
            gasResolutionWgsl,
            fireResolutionWgsl,
            phaseResolutionWgsl,
            transitionsWgsl,
            reactionsWgsl,
            simWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static Diffusion(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateMaterialCount(),
            ShaderFactory.GenerateMaterialPhaseConstants(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateMaxDensity(),
            ShaderFactory.GenerateVelocityConstants(),
            ShaderFactory.GenerateMaterialPhysicsEntryStruct(),
            ShaderFactory.GenerateDiffusionUniformStruct(),
            commonWgsl,
            identityWgsl,
            identityQueriesWgsl,
            phaseWgsl,
            displacementWgsl,
            diffusionWgsl,
        ].join('\n');
    }
    //#endregion

    //#region PHYSICS
    // @omitfromdocs
    public static Physics(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateMaterialCount(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GeneratePhysicsConstants(),
            ShaderFactory.GenerateGameObjectStateConstants(),
            ShaderFactory.GenerateMaxDensity(),
            ShaderFactory.GenerateVelocityConstants(),
            ShaderFactory.GenerateMaterialPhaseConstants(),
            ShaderFactory.GeneratePhysicsUniformStruct(),
            ShaderFactory.GenerateMaterialPhysicsEntryStruct(),
            commonWgsl,
            identityWgsl,
            phaseWgsl,
            temperaturePropagationWgsl,
            pressurePropagationWgsl,
            velocityPropagationWgsl,
            physicsWgsl,
        ].join('\n');
    }
    //#endregion

    //#region BRUSH
    // @omitfromdocs
    public static Brush(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateMaterialCount(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateMaxDensity(),
            ShaderFactory.GenerateBrushPatternConstants(),
            ShaderFactory.GenerateColorsPerMaterial(),
            ShaderFactory.GenerateBrushUniformStruct(),
            ShaderFactory.GenerateMaterialPhysicsEntryStruct(),
            ShaderFactory.GenerateMaterialStateEntryStruct(),
            ShaderFactory.GenerateMaterialStateIndexHelper(),
            commonWgsl,
            identityWgsl,
            instantiateCellWgsl,
            brushOutputWgsl,
            brushWgsl,
        ].join('\n');
    }
    //#endregion

    //#region VISUAL
    // @omitfromdocs
    public static Display(): string {
        return [
            ShaderFactory.GenerateColorsPerMaterial(),
            ShaderFactory.GenerateVisualEntryStruct(),
            commonWgsl,
            displayWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static Composite(): string {
        return compositeWgsl;
    }

    // @omitfromdocs
    public static SimulationRender(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateColorsPerMaterial(),
            ShaderFactory.GenerateVisualEntryStruct(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            commonWgsl,
            simRenderWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static GameObjectRender(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateColorsPerMaterial(),
            ShaderFactory.GenerateVisualEntryStruct(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            commonWgsl,
            gameObjectRenderWgsl,
        ].join('\n');
    }
    //#endregion

    //#region GAME OBJECT
    // @omitfromdocs
    public static GameObjectErase(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateGameObjectStateStruct(),
            ShaderFactory.GenerateGameObjectCellStruct(),
            ShaderFactory.GenerateGameObjectPassUniformStruct(),
            commonWgsl,
            gameObjectEraseWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static GameObjectStamp(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateMaterialCount(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateMaxDensity(),
            ShaderFactory.GenerateMaterialPhaseConstants(),
            ShaderFactory.GenerateMaterialPhysicsEntryStruct(),
            ShaderFactory.GenerateMaterialStateEntryStruct(),
            ShaderFactory.GenerateMaterialStateIndexHelper(),
            ShaderFactory.GenerateReactionConstants(),
            ShaderFactory.GenerateGameObjectStateStruct(),
            ShaderFactory.GenerateGameObjectCellStruct(),
            ShaderFactory.GenerateGameObjectPassUniformStruct(),
            commonWgsl,
            identityWgsl,
            phaseWgsl,
            transitionsWgsl,
            reactionsWgsl,
            gameObjectStampWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static GameObjectPhysics(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateGameObjectStateStruct(),
            ShaderFactory.GenerateGameObjectPhysicsUniformStruct(),
            ShaderFactory.GenerateGameObjectBodyTypeConstants(),
            gameObjectPhysicsWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static GameObjectCollision(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateMaterialCount(),
            ShaderFactory.GenerateMaterialPhaseConstants(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateMaterialPhysicsEntryStruct(),
            ShaderFactory.GenerateGameObjectStateStruct(),
            ShaderFactory.GenerateGameObjectColliderStruct(),
            ShaderFactory.GenerateGameObjectCollisionUniformStruct(),
            ShaderFactory.GenerateGameObjectBodyTypeConstants(),
            commonWgsl,
            identityWgsl,
            phaseWgsl,
            gameObjectCollisionWgsl,
        ].join('\n');
    }
    //#endregion

    //#region PARTICLE
    // @omitfromdocs
    public static ParticleMaterialEmission(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateParticleConstants(),
            ShaderFactory.GenerateParticleEmissionUniformStruct(),
            commonWgsl,
            particleSharedWgsl,
            particleSubEmitterWgsl,
            particleSpawnWgsl,
            particleMaterialEmitterWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static ParticleGameObjectEmission(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateParticleWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateParticleConstants(),
            ShaderFactory.GenerateParticleEmissionUniformStruct(),
            commonWgsl,
            particleSharedWgsl,
            particleSubEmitterWgsl,
            particleSpawnWgsl,
            particleGameObjectEmitterWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static ParticleSimulation(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateParticleWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateParticleConstants(),
            ShaderFactory.GenerateParticleSimulationUniformStruct(),
            commonWgsl,
            particleSharedWgsl,
            particleSubEmitterWgsl,
            particleSimulationWgsl,
        ].join('\n');
    }

    // @omitfromdocs
    public static ParticleRender(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateMaterialCount(),
            ShaderFactory.GenerateParticleWorkgroupSize(workgroupSize),
            ShaderFactory.GenerateParticleConstants(),
            ShaderFactory.GenerateColorsPerMaterial(),
            ShaderFactory.GenerateVisualEntryStruct(),
            ShaderFactory.GenerateParticleRenderUniformStruct(),
            particleRenderWgsl,
        ].join('\n');
    }
    //#endregion

    //#region DEBUG
    // @omitfromdocs
    public static Analytics(workgroupSize: number): string {
        return [
            ShaderFactory.GenerateMaterialCount(),
            ShaderFactory.GenerateWorkgroupSize(workgroupSize),
            commonWgsl,
            identityWgsl,
            analyticsWgsl,
        ].join('\n');
    }
    //#endregion
}
