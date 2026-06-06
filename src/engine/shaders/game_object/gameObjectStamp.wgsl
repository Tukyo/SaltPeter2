@group(0) @binding(0)  var<storage, read> gameObjectCells:  array<GameObjectCell>;
@group(0) @binding(1)  var<storage, read> gameObjectStates: array<GameObjectState>;
@group(0) @binding(2)  var<uniform>       uniforms:         GameObjectPassUniforms;
@group(0) @binding(3)  var               currentIdentity:   texture_2d<f32>;
@group(0) @binding(4)  var               currentOwnership:  texture_2d<u32>;
@group(0) @binding(5)  var               nextIdentity:      texture_storage_2d<rgba8unorm,  write>;
@group(0) @binding(6)  var               nextOwnership:     texture_storage_2d<r32uint,     write>;
@group(0) @binding(7)  var               currentPhysics:    texture_2d<f32>;
@group(0) @binding(8)  var               nextPhysics:       texture_storage_2d<rgba32float, write>;
@group(0) @binding(9)  var               currentState:      texture_2d<f32>;
@group(0) @binding(10) var               nextState:         texture_storage_2d<rgba32float, write>;
@group(0) @binding(11) var<storage, read_write> deadCells:        array<u32>;
@group(0) @binding(12) var              nextIdentityTexture: texture_storage_2d<rgba8unorm,  write>;
@group(0) @binding(13) var<storage, read>       physicsMaterials: array<MaterialPhysicsEntry>;
@group(0) @binding(14) var<storage, read>       materialStates:   array<MaterialStateEntry>;
@group(0) @binding(15) var              simNextPhysics:      texture_storage_2d<rgba32float, write>;
@group(0) @binding(16) var              nextCellStateTexture: texture_storage_2d<rgba32float, write>;
@group(0) @binding(17) var              identityTexture:     texture_storage_2d<rgba8unorm,  read>;
@group(0) @binding(18) var<storage, read> reactionLookup:   array<f32>;
@group(0) @binding(19) var              goIdentityTexture:   texture_2d<f32>;

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

// Bleed corners only write identity and ownership — no physics or state.
fn stampBleedAt(
    coord:         vec2<i32>,
    encodedOwner:  u32,
    identityValue: vec4<f32>,
    simW:          i32,
    simH:          i32,
) {
    if (coord.x < 0 || coord.y < 0 || coord.x >= simW || coord.y >= simH) { return; }
    let existingOwner  = textureLoad(currentOwnership, coord, 0).r;
    let existingSample = textureLoad(currentIdentity,  coord, 0);
    if (existingSample.a > 0.0 && existingOwner != encodedOwner) { return; }
    textureStore(nextIdentity,  coord, identityValue);
    textureStore(nextOwnership, coord, vec4<u32>(encodedOwner, 0u, 0u, 0u));
}

@compute @workgroup_size(WG_SIZE, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let cellIdx = id.x;
    if (cellIdx >= uniforms.totalCells) { return; }
    if (deadCells[cellIdx] != 0u) { return; }

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
    let bleedX = fracX > uniforms.bleedThreshold;
    let bleedY = fracY > uniforms.bleedThreshold;

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

    let matIdx        = clamp(i32(cell.materialId), 0, MATERIAL_COUNT - 1);
    let restingTemp   = physicsMaterials[matIdx].restingTemperature;
    let stateBase     = getMaterialStateBase(f32(cell.materialId));
    let spawnLifetime = select(0.0, 1.0, materialStates[stateBase].lifetime > 0.0);

    var physicsSample     = vec4<f32>(restingTemp, 0.0, 0.0, 0.0);
    var stateSample       = vec4<f32>(1.0, spawnLifetime, 0.0, 0.0);
    var materialIdEncoded = f32(cell.materialId) / MATERIAL_ID_SCALE;
    if (prevWx >= 0 && prevWy >= 0 && prevWx < simW && prevWy < simH) {
        let prevCoord  = vec2<i32>(prevWx, prevWy);
        let prevOwner  = textureLoad(currentOwnership, prevCoord, 0).r;
        if (prevOwner == encodedOwner) {
            physicsSample     = textureLoad(currentPhysics,  prevCoord, 0);
            stateSample       = textureLoad(currentState,    prevCoord, 0);
            materialIdEncoded = textureLoad(currentIdentity, prevCoord, 0).r;
        }
    }

    let identityValue = vec4<f32>(
        materialIdEncoded,
        cell.colorSeed,
        encodeVariantId(f32(cell.variantId)),
        f32(cell.occupancy) / 255.0
    );

    // Transition check — if temperature crosses this cell's phase threshold, eject into the sim.
    let targetId = getTransitionTargetId(identityValue, physicsSample.r);
    if (targetId > 0.0) {
        deadCells[cellIdx] = 1u;
        let simCoord = vec2<i32>(x0, y0);
        if (simCoord.x >= 0 && simCoord.y >= 0 && simCoord.x < simW && simCoord.y < simH) {
            textureStore(nextIdentityTexture, simCoord, makeMaterialState(targetId, cell.colorSeed, OCCUPANCY_DYNAMIC));
            textureStore(simNextPhysics,      simCoord, vec4<f32>(physicsSample.r, 0.0, 0.0, 0.0));
            textureStore(nextCellStateTexture, simCoord, vec4<f32>(1.0, 0.0, 0.0, 0.0));
        }
        return;
    }

    // Reaction check — if a sim neighbor reacts with this cell, eject the product into the sim.
    let coord2f = vec2f(f32(x0), f32(y0));
    let res2f   = vec2f(f32(simW), f32(simH));
    let reactionResult = checkReactions(coord2f, res2f, identityValue, uniforms.time);
    if (reactionResult.state.a >= 0.0) {
        deadCells[cellIdx] = 1u;
        if (isOccupiedState(reactionResult.state)) {
            let simCoord = vec2<i32>(x0, y0);
            if (simCoord.x >= 0 && simCoord.y >= 0 && simCoord.x < simW && simCoord.y < simH) {
                textureStore(nextIdentityTexture,  simCoord, reactionResult.state);
                textureStore(simNextPhysics,       simCoord, vec4<f32>(physicsSample.r, 0.0, 0.0, 0.0));
                textureStore(nextCellStateTexture, simCoord, reactionResult.cellState);
            }
        }
        return;
    }

    // Primary corner — always written
    stampAt(vec2<i32>(x0, y0),         encodedOwner, identityValue, physicsSample, stateSample, simW, simH);
    // X neighbor — written when the cell bleeds past the integer column boundary
    if (bleedX) {
        stampBleedAt(vec2<i32>(x0 + 1, y0), encodedOwner, identityValue, simW, simH);
    }
    // Y neighbor — written when the cell bleeds past the integer row boundary
    if (bleedY) {
        stampBleedAt(vec2<i32>(x0, y0 + 1), encodedOwner, identityValue, simW, simH);
    }
    // Diagonal corner — written when bleeding in both axes
    if (bleedX && bleedY) {
        stampBleedAt(vec2<i32>(x0 + 1, y0 + 1), encodedOwner, identityValue, simW, simH);
    }
}
