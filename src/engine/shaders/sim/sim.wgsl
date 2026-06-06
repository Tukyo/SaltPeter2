// Bindings referenced by shared/phase helpers assembled into the sim shader.
@group(0) @binding(0) var identityTexture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var nextIdentityTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var intentTexture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(3) var<storage, read> physicsMaterials: array<MaterialPhysicsEntry>;
@group(0) @binding(4) var<storage, read> materialSimulationData: array<f32>;
@group(0) @binding(5) var<uniform> uniforms: SimUniforms;
@group(0) @binding(6) var physicsTexture: texture_storage_2d<rgba32float, read>;
@group(0) @binding(7) var nextPhysicsTexture: texture_storage_2d<rgba32float, write>;
@group(0) @binding(8) var cellStateTexture: texture_storage_2d<rgba32float, read>;
@group(0) @binding(9) var nextCellStateTexture: texture_storage_2d<rgba32float, write>;
@group(0) @binding(10) var<storage, read> materialStates: array<MaterialStateEntry>;
@group(0) @binding(11) var<storage, read> reactionLookup: array<f32>;
@group(0) @binding(12) var goOwnershipTexture: texture_storage_2d<r32uint,    read>;
@group(0) @binding(13) var goIdentityTexture: texture_2d<f32>;
@compute @workgroup_size(WG_SIZE, WG_SIZE)

fn main(@builtin(global_invocation_id) id: vec3u) {
    let res = vec2f(textureDimensions(identityTexture));
    let coord = vec2f(f32(id.x), f32(id.y));

    if !inBounds(coord, res) { return; }

    let currentIdentityState = textureLoad(identityTexture, vec2i(id.xy));
    let currentPhysics = textureLoad(physicsTexture, vec2i(id.xy));

    let resolvedCell = resolveCellForState(
        coord,
        res,
        currentIdentityState,
        getGravityDirection(uniforms.gravity),
        uniforms.time
    );
    let resolved = resolvedCell.identityState;

    let materialStayed = abs(getStateMaterialId(currentIdentityState) - getStateMaterialId(resolved)) < 0.5;
    let isNewArrival = !materialStayed && isOccupiedState(resolved);

    // Temperature travels with the moving particle: read the source cell's temperature so
    // heat is carried across moves instead of resetting to resting temperature each frame.
    let sourcePhysics = select(currentPhysics, textureLoad(physicsTexture, vec2i(resolvedCell.source)), isNewArrival);
    let sourceTemp = sourcePhysics.r;
    let targetId = select(-1.0, getTransitionTargetId(resolved, sourceTemp), isOccupiedState(resolved));
    var finalVx = sourcePhysics.b;
    var finalVy = sourcePhysics.a;
    if isNewArrival {
        let moveDir = vec2f(id.xy) - vec2f(resolvedCell.source);
        let resolvedPhase = getMaterialPhaseId(getStateMaterialId(resolved));
        var accel = 0.0;
        switch i32(resolvedPhase) {
            case 0: { accel = VELOCITY_ACCELERATION_SOLID; }
            case 1: { accel = VELOCITY_ACCELERATION_POWDER; }
            case 2: { accel = VELOCITY_ACCELERATION_LIQUID; }
            default: {}
        }
        finalVx = clamp(sourcePhysics.b + moveDir.x * accel, -MAX_VELOCITY, MAX_VELOCITY);
        finalVy = clamp(sourcePhysics.a + moveDir.y * accel, -MAX_VELOCITY, MAX_VELOCITY);
    }
    textureStore(nextPhysicsTexture, vec2i(id.xy), vec4f(sourceTemp, currentPhysics.g, finalVx, finalVy));

    // Cell state travels with the moving particle. Clear when cell becomes air.
    // On transition, reinitialize state for the incoming material.
    var sourceCellState = select(textureLoad(cellStateTexture, vec2i(id.xy)), textureLoad(cellStateTexture, vec2i(resolvedCell.source)), isNewArrival);
    if isValidMaterialId(targetId) {
        let newStateBase = getMaterialStateBase(targetId);
        let newLifetime = materialStates[newStateBase].lifetime;
        sourceCellState = vec4f(1.0, select(0.0, 1.0, newLifetime > 0.0), 0.0, 0.0);
    } else if isOccupiedState(resolved) {
        let stateBase = getMaterialStateBase(getStateMaterialId(resolved));
        let matLifetime = materialStates[stateBase].lifetime;
        if matLifetime > 0.0 {
            sourceCellState.g = max(0.0, sourceCellState.g - uniforms.deltaTime / matLifetime);
        }
    }
    let transitionedState = select(resolved, makeStateWithSeed(targetId, getStateColorSeed(resolved)), isValidMaterialId(targetId));
    let reactionResult = checkReactions(coord, res, transitionedState, uniforms.time);
    let finalState = select(transitionedState, reactionResult.state, reactionResult.state.a >= 0.0);

    if reactionResult.state.a >= 0.0 && isOccupiedState(finalState) {
        sourceCellState = reactionResult.cellState;
    }

    textureStore(nextCellStateTexture, vec2i(id.xy), select(vec4f(0.0), sourceCellState, isOccupiedState(finalState)));
    textureStore(nextIdentityTexture, vec2i(id.xy), finalState);
}
