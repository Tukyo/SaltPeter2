@group(0) @binding(0) var<storage, read_write> gameObjectStates: array<GameObjectState>;
@group(0) @binding(1) var<uniform> uniforms: GameObjectPhysicsUniforms;

@compute @workgroup_size(WG_SIZE, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let gameObjectIdx = id.x;
    if gameObjectIdx >= uniforms.gameObjectCount { return; }

    var state = gameObjectStates[gameObjectIdx];
    if state.isActive == 0u || state.bodyType != GAMEOBJECT_BODY_DYNAMIC { return; }
    if state.isSleeping == 1u { return; }

    // Save current position and angle before integration so stamp can carry state
    // forward from the previous cell locations in the texture
    state.prevPosX = state.posX;
    state.prevPosY = state.posY;
    state.prevTheta = state.theta;

    // Gravity reduces upward velocity (sim Y-up: positive Y is up)
    state.velY -= uniforms.gravity * state.gravityScale * uniforms.simStepDuration;

    // Linear drag — effective drag is drag/mass so heavier objects have higher terminal velocity
    let dragFactor = max(0.0, 1.0 - (state.drag / max(0.001, state.accumulatedMass)) * uniforms.simStepDuration);
    state.velX *= dragFactor;
    state.velY *= dragFactor;

    // Angular drag — same formula as linear drag so angularDrag/mass gives consistent units
    let angularDragFactor = max(0.0, 1.0 - (state.angularDrag / max(0.001, state.accumulatedMass)) * uniforms.simStepDuration);
    state.omega *= angularDragFactor;

    // Clamp velocity so displacement stays <= maxSpeed cells per step — GOs live on the same
    // pixel layer as the sim, which is strictly 1-cell-per-step. Allowing faster movement means
    // the collision pass cannot sample the skipped cells, causing tunneling.
    let maxVelocity = uniforms.maxSpeed / max(0.001, uniforms.simStepDuration);
    let speed = length(vec2<f32>(state.velX, state.velY));
    if speed > maxVelocity {
        let scale = maxVelocity / speed;
        state.velX *= scale;
        state.velY *= scale;
    }

    // Clamp angular speed
    state.omega = clamp(state.omega, -uniforms.maxAngularSpeed, uniforms.maxAngularSpeed);

    // Integrate position and angle
    state.posX += state.velX * uniforms.simStepDuration;
    state.posY += state.velY * uniforms.simStepDuration;
    state.theta += state.omega * uniforms.simStepDuration;

    gameObjectStates[gameObjectIdx] = state;
}
