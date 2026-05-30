@group(0) @binding(0)  var<storage, read> gameObjectCells:  array<GameObjectCell>;
@group(0) @binding(1)  var<storage, read> gameObjectStates: array<GameObjectState>;
@group(0) @binding(2)  var<uniform>       uniforms:         GameObjectPassUniforms;
@group(0) @binding(3)  var               currentIdentity:  texture_2d<f32>;
@group(0) @binding(4)  var               currentOwnership: texture_2d<u32>;
@group(0) @binding(5)  var               nextIdentity:     texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(6)  var               nextOwnership:    texture_storage_2d<r32uint, write>;
@group(0) @binding(7)  var               currentPhysics:   texture_2d<f32>;
@group(0) @binding(8)  var               nextPhysics:      texture_storage_2d<rgba32float, write>;
@group(0) @binding(9)  var               currentState:     texture_2d<f32>;
@group(0) @binding(10) var               nextState:        texture_storage_2d<rgba32float, write>;

// Stamps identity/physics/state at a single world coord if it is in bounds and not occupied
// by a sim cell or a different game object. Used for each corner of the rotated cell footprint.
fn stampAt(
    coord:         vec2<i32>,
    encodedOwner:  u32,
    identityValue: vec4<f32>,
    physicsSample: vec4<f32>,
    stateSample:   vec4<f32>,
    simW:          i32,
    simH:          i32,
) {
    if (coord.x < 0 || coord.y < 0 || coord.x >= simW || coord.y >= simH) { return; }
    let existingOwner  = textureLoad(currentOwnership, coord, 0).r;
    let existingSample = textureLoad(currentIdentity,  coord, 0);
    if (existingSample.a > 0.0 && existingOwner != encodedOwner) { return; }
    textureStore(nextIdentity,  coord, identityValue);
    textureStore(nextPhysics,   coord, physicsSample);
    textureStore(nextState,     coord, stateSample);
    textureStore(nextOwnership, coord, vec4<u32>(encodedOwner, 0u, 0u, 0u));
}

@compute @workgroup_size(WG_SIZE, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let cellIdx = id.x;
    if (cellIdx >= uniforms.totalCells) { return; }

    let cell  = gameObjectCells[cellIdx];
    let state = gameObjectStates[cell.gameObjectIdx];
    if (state.isActive == 0u) { return; }

    let cosTheta = cos(state.theta);
    let sinTheta = sin(state.theta);
    // Pivot-relative local coords: rotation is around the pivot cell (posX, posY in world space).
    let localFX  = f32(cell.localX) - state.pivotX;
    let localFY  = f32(cell.localY) - state.pivotY;

    // Keep as float — the fractional parts determine which neighboring grid cells this
    // rotated cell bleeds into, which is what fills the checkerboard holes.
    let fx = state.posX + cosTheta * localFX - sinTheta * localFY;
    let fy = state.posY + sinTheta * localFX + cosTheta * localFY;

    let x0    = i32(floor(fx));
    let y0    = i32(floor(fy));
    let fracX = fx - f32(x0);
    let fracY = fy - f32(y0);

    // Only spread to a neighbor if the float position genuinely bleeds past an integer boundary.
    // At theta=0 with integer-aligned coords fracX/fracY are ~0, collapsing to a single write.
    let bleedX = fracX > 0.001;
    let bleedY = fracY > 0.001;

    let encodedOwner = cell.gameObjectIdx + 1u;
    let simW = i32(uniforms.simWidth);
    let simH = i32(uniforms.simHeight);

    // Read dynamic per-cell state once from the previous rotated position and reuse
    // for every corner write — all corners belong to the same source cell.
    // localFX/localFY are already pivot-relative — reused directly here.
    let cosPrevTheta = cos(state.prevTheta);
    let sinPrevTheta = sin(state.prevTheta);
    let prevWx = i32(floor(state.prevPosX + cosPrevTheta * localFX - sinPrevTheta * localFY));
    let prevWy = i32(floor(state.prevPosY + sinPrevTheta * localFX + cosPrevTheta * localFY));

    var physicsSample = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var stateSample   = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    if (prevWx >= 0 && prevWy >= 0 && prevWx < simW && prevWy < simH) {
        let prevCoord = vec2<i32>(prevWx, prevWy);
        physicsSample = textureLoad(currentPhysics, prevCoord, 0);
        stateSample   = textureLoad(currentState,   prevCoord, 0);
    }

    let identityValue = vec4<f32>(
        f32(cell.materialId) / MATERIAL_ID_SCALE,
        cell.colorSeed,
        0.0,
        OCCUPANCY_STATIC
    );

    // Primary corner — always written
    stampAt(vec2<i32>(x0, y0),         encodedOwner, identityValue, physicsSample, stateSample, simW, simH);
    // X neighbor — written when the cell bleeds past the integer column boundary
    if (bleedX) {
        stampAt(vec2<i32>(x0 + 1, y0), encodedOwner, identityValue, physicsSample, stateSample, simW, simH);
    }
    // Y neighbor — written when the cell bleeds past the integer row boundary
    if (bleedY) {
        stampAt(vec2<i32>(x0, y0 + 1), encodedOwner, identityValue, physicsSample, stateSample, simW, simH);
    }
    // Diagonal corner — written when bleeding in both axes
    if (bleedX && bleedY) {
        stampAt(vec2<i32>(x0 + 1, y0 + 1), encodedOwner, identityValue, physicsSample, stateSample, simW, simH);
    }
}
