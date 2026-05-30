@group(0) @binding(0) var<storage, read> gameObjectCells:  array<GameObjectCell>;
@group(0) @binding(1) var<storage, read> gameObjectStates: array<GameObjectState>;
@group(0) @binding(2) var<uniform>       uniforms:         GameObjectPassUniforms;
@group(0) @binding(3) var                currentOwnership: texture_2d<u32>;
@group(0) @binding(4) var                nextIdentity:     texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(5) var                nextOwnership:    texture_storage_2d<r32uint, write>;

// Clears identity and ownership at coord if in bounds and owned by encodedOwner.
fn eraseAt(coord: vec2<i32>, encodedOwner: u32, simW: i32, simH: i32) {
    if (coord.x < 0 || coord.y < 0 || coord.x >= simW || coord.y >= simH) { return; }
    if (textureLoad(currentOwnership, coord, 0).r != encodedOwner) { return; }
    textureStore(nextIdentity,  coord, vec4<f32>(0.0, 0.0, 0.0, 0.0));
    textureStore(nextOwnership, coord, vec4<u32>(0u, 0u, 0u, 0u));
}

// Unconditionally clears ownership at coord if in bounds.
// Used for the belt-and-suspenders prevTheta pass, which targets 2-frame-old data sitting in
// nextOwnership — currentOwnership is 1 frame old, so an ownership check would always fail.
fn clearOwnershipAt(coord: vec2<i32>, simW: i32, simH: i32) {
    if (coord.x < 0 || coord.y < 0 || coord.x >= simW || coord.y >= simH) { return; }
    textureStore(nextOwnership, coord, vec4<u32>(0u, 0u, 0u, 0u));
}

@compute @workgroup_size(WG_SIZE, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let cellIdx = id.x;
    if (cellIdx >= uniforms.totalCells) { return; }

    let cell  = gameObjectCells[cellIdx];
    let state = gameObjectStates[cell.gameObjectIdx];
    if (state.isActive == 0u) { return; }

    // posX/posY and theta are still last-frame values here — physics has not run yet.
    // These match exactly what the stamp pass wrote last frame, including the bleed corners.
    let cosTheta = cos(state.theta);
    let sinTheta = sin(state.theta);
    // Pivot-relative local coords: rotation is around the pivot cell (posX, posY in world space).
    let localFX  = f32(cell.localX) - state.pivotX;
    let localFY  = f32(cell.localY) - state.pivotY;

    let fx = state.posX + cosTheta * localFX - sinTheta * localFY;
    let fy = state.posY + sinTheta * localFX + cosTheta * localFY;

    let x0     = i32(floor(fx));
    let y0     = i32(floor(fy));
    let bleedX = (fx - f32(x0)) > 0.001;
    let bleedY = (fy - f32(y0)) > 0.001;

    let encodedOwner = cell.gameObjectIdx + 1u;
    let simW = i32(uniforms.simWidth);
    let simH = i32(uniforms.simHeight);

    // Primary clear — matches the 4-corner footprint the stamp wrote last frame
    eraseAt(vec2<i32>(x0, y0),         encodedOwner, simW, simH);
    if (bleedX) { eraseAt(vec2<i32>(x0 + 1, y0),         encodedOwner, simW, simH); }
    if (bleedY) { eraseAt(vec2<i32>(x0, y0 + 1),         encodedOwner, simW, simH); }
    if (bleedX && bleedY) { eraseAt(vec2<i32>(x0 + 1, y0 + 1), encodedOwner, simW, simH); }

    // Belt-and-suspenders: unconditionally wipe the 4-corner footprint at prevTheta/prevPos.
    // nextOwnership holds 2-frame-old data at these positions; currentOwnership is 1 frame old
    // so an ownership check would always fail here — same as the original single-pixel clear.
    // localFX/localFY are already pivot-relative — reused directly here.
    let cosPrevTheta = cos(state.prevTheta);
    let sinPrevTheta = sin(state.prevTheta);
    let prevFx = state.prevPosX + cosPrevTheta * localFX - sinPrevTheta * localFY;
    let prevFy = state.prevPosY + sinPrevTheta * localFX + cosPrevTheta * localFY;
    let px0     = i32(floor(prevFx));
    let py0     = i32(floor(prevFy));
    let pBleedX = (prevFx - f32(px0)) > 0.001;
    let pBleedY = (prevFy - f32(py0)) > 0.001;

    clearOwnershipAt(vec2<i32>(px0, py0),             simW, simH);
    if (pBleedX) { clearOwnershipAt(vec2<i32>(px0 + 1, py0),         simW, simH); }
    if (pBleedY) { clearOwnershipAt(vec2<i32>(px0, py0 + 1),         simW, simH); }
    if (pBleedX && pBleedY) { clearOwnershipAt(vec2<i32>(px0 + 1, py0 + 1), simW, simH); }
}
