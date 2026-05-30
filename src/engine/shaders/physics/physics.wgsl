// PhysicsPass entrypoint. Runs on a fixed interval independent of the sim pass.
// Reads identityTexture to know what material each cell is.
// Reads currentPhysics, writes nextPhysics.
// Temperature propagation and pressure propagation logic assembles before this file.

@group(0) @binding(0) var identityTexture:        texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var physicsTexture:       texture_storage_2d<rgba32float, read>;
@group(0) @binding(2) var nextPhysicsTexture:   texture_storage_2d<rgba32float, write>;
@group(0) @binding(3) var<storage, read> physicsMaterials: array<MaterialPhysicsEntry>;
@group(0) @binding(4) var<uniform> physicsUniforms: PhysicsUniforms;

@compute @workgroup_size(WG_SIZE, WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let res   = vec2f(textureDimensions(identityTexture));
    let coord = vec2f(f32(id.x), f32(id.y));

    if !inBounds(coord, res) { return; }

    let existing    = textureLoad(physicsTexture, vec2i(id.xy));
    let temperature = propagateTemperature(coord, res);
    let pressure    = computePressure(coord, res, physicsUniforms.gravity);

    let identityState = textureLoad(identityTexture, vec2i(id.xy));
    let occupied      = isOccupiedState(identityState);
    let isStatic      = isStaticCell(identityState);
    let belowCoord    = vec2i(i32(id.x), i32(id.y) - 1);
    let belowIsAir    = inBounds(vec2f(belowCoord), res) && !isOccupiedState(textureLoad(identityTexture, belowCoord));
    let phaseId       = getMaterialPhaseId(getStateMaterialId(identityState));
    let isGravityAffected = occupied && !isStatic &&
        !isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS) &&
        !isMaterialPhaseId(phaseId, MATERIAL_PHASE_FIRE);
    let propVel  = propagateVelocity(coord, res);
    var accel   = 0.0;
    var damping = 1.0;
    switch i32(phaseId) {
        case 0: { accel = VELOCITY_ACCELERATION_SOLID;  damping = VELOCITY_DAMPING_SOLID; }
        case 1: { accel = VELOCITY_ACCELERATION_POWDER; damping = VELOCITY_DAMPING_POWDER; }
        case 2: { accel = VELOCITY_ACCELERATION_LIQUID; damping = VELOCITY_DAMPING_LIQUID; }
        default: {}
    }
    var vx = decodeVelocity(propVel.x);
    var vy = decodeVelocity(propVel.y);
    if !occupied || isStatic {
        vx = 0.0;
        vy = 0.0;
    } else if isGravityAffected {
        if belowIsAir {
            vy = (vy - accel) * damping;
        } else {
            vy = vy * damping;
        }
        vx = vx * damping;
    } else {
        vx = vx * damping;
        vy = vy * damping;
    }

    textureStore(
        nextPhysicsTexture,
        vec2i(id.xy),
        vec4f(temperature, pressure, encodeVelocity(vx), encodeVelocity(vy))
    );
}
