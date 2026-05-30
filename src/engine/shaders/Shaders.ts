// Central re-export for all WGSL shader sources.
// Pass files import by name from here — never directly from the shaders/ folder.

// Shared helpers
export { default as commonWgsl } from './shared/common.wgsl?raw';
export { default as identityWgsl } from './shared/identity.wgsl?raw';
export { default as identityQueriesWgsl } from './shared/identityQueries.wgsl?raw';
export { default as intentHelpersWgsl } from './shared/intent.wgsl?raw';
export { default as intentReadWgsl } from './shared/intentRead.wgsl?raw';
export { default as displacementWgsl } from './shared/displacement.wgsl?raw';
// Phase dispatch
export { default as phaseWgsl } from './phase/phase.wgsl?raw';
export { default as phaseIntentWgsl } from './phase/phaseIntent.wgsl?raw';
export { default as phaseResolutionWgsl } from './phase/phaseResolution.wgsl?raw';

// Phase — solid
export { default as solidSimulationWgsl } from './phase/solid/solidSimulation.wgsl?raw';
export { default as solidIntentWgsl } from './phase/solid/solidIntent.wgsl?raw';
export { default as solidResolutionWgsl } from './phase/solid/solidResolution.wgsl?raw';

// Phase — powder
export { default as powderSimulationWgsl } from './phase/powder/powderSimulation.wgsl?raw';
export { default as powderQueriesWgsl } from './phase/powder/powderQueries.wgsl?raw';
export { default as powderTargetingWgsl } from './phase/powder/powderTargeting.wgsl?raw';
export { default as powderIntentWgsl } from './phase/powder/powderIntent.wgsl?raw';
export { default as powderResolutionWgsl } from './phase/powder/powderResolution.wgsl?raw';

// Phase — liquid
export { default as liquidSimulationWgsl } from './phase/liquid/liquidSimulation.wgsl?raw';
export { default as liquidIntentWgsl } from './phase/liquid/liquidIntent.wgsl?raw';
export { default as liquidResolutionWgsl } from './phase/liquid/liquidResolution.wgsl?raw';

// Phase — gas
export { default as gasSimulationWgsl } from './phase/gas/gasSimulation.wgsl?raw';
export { default as gasIntentWgsl } from './phase/gas/gasIntent.wgsl?raw';
export { default as gasResolutionWgsl } from './phase/gas/gasResolution.wgsl?raw';

// Phase — fire
export { default as fireSimulationWgsl } from './phase/fire/fireSimulation.wgsl?raw';
export { default as fireIntentWgsl } from './phase/fire/fireIntent.wgsl?raw';
export { default as fireResolutionWgsl } from './phase/fire/fireResolution.wgsl?raw';

// Simulation passes
export { default as intentWgsl } from './sim/intent.wgsl?raw';
export { default as simWgsl } from './sim/sim.wgsl?raw';
export { default as reactionsWgsl } from './sim/reactions.wgsl?raw';

// Physics
export { default as physicsWgsl } from './physics/physics.wgsl?raw';
export { default as temperaturePropagationWgsl } from './physics/temperaturePropagation.wgsl?raw';
export { default as pressurePropagationWgsl } from './physics/pressurePropagation.wgsl?raw';
export { default as velocityPropagationWgsl } from './physics/velocityPropagation.wgsl?raw';
export { default as transitionsWgsl } from './physics/transitions.wgsl?raw';

// Diffusion
export { default as diffusionWgsl } from './diffusion/diffusion.wgsl?raw';

// Brush
export { default as brushWgsl } from './brush/brush.wgsl?raw';
export { default as brushOutputWgsl } from './brush/brushOutput.wgsl?raw';

// State
export { default as stateWgsl } from './state/state.wgsl?raw';

// Debug
export { default as analyticsWgsl } from './analytics/analytics.wgsl?raw';

// Instantiation
export { default as instantiateCellWgsl } from './instantiation/instantiateCell.wgsl?raw';

// Visual
export { default as displayWgsl } from './visual/display.wgsl?raw';

// Game object
export { default as gameObjectEraseWgsl } from './game_object/gameObjectErase.wgsl?raw';
export { default as gameObjectStampWgsl } from './game_object/gameObjectStamp.wgsl?raw';
export { default as gameObjectPhysicsWgsl } from './game_object/gameObjectPhysics.wgsl?raw';
export { default as gameObjectCollisionWgsl } from './game_object/gameObjectCollision.wgsl?raw';
