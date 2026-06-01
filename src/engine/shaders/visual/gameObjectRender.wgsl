// Writes GO cell colors into gameObjectsTexture for the FRP GO layer.
// One thread per GO slot. Iterates each cell, computes world position, writes color.
// No occupancy check — always writes unconditionally.
// gameObjectsTexture is cleared each frame before this runs.

struct GoRenderUniforms {
    simWidth: u32,
    simHeight: u32,
    gameObjectCount: u32,
}

@group(0) @binding(0) var<storage, read> gameObjectStates: array<GameObjectState>;
@group(0) @binding(1) var<storage, read> cells:            array<GameObjectCell>;
@group(0) @binding(2) var<uniform>       uniforms:         GoRenderUniforms;
@group(0) @binding(3) var<storage, read> materials:        array<VisualEntry>;
@group(0) @binding(4) var gameObjectsTexture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(WG_SIZE, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let goIdx = id.x;
    if (goIdx >= uniforms.gameObjectCount) { return; }

    let state = gameObjectStates[goIdx];
    if (state.isActive == 0u) { return; }

    let cosTheta = cos(state.theta);
    let sinTheta = sin(state.theta);
    let simW = i32(uniforms.simWidth);
    let simH = i32(uniforms.simHeight);

    for (var i: u32 = 0u; i < state.cellCount; i++) {
        let cell = cells[state.cellOffset + i];

        let localFX = f32(cell.localX) - state.pivotX;
        let localFY = f32(cell.localY) - state.pivotY;
        let wx = i32(floor(state.posX + cosTheta * localFX - sinTheta * localFY));
        let wy = i32(floor(state.posY + sinTheta * localFX + cosTheta * localFY));

        if (wx < 0 || wy < 0 || wx >= simW || wy >= simH) { continue; }

        let localColorIdx = i32(floor(clamp(cell.colorSeed, 0.0, 0.999999) * COLORS_PER_MATERIAL));
        let color = materials[i32(cell.materialId)].colors[localColorIdx];

        textureStore(gameObjectsTexture, vec2<i32>(wx, wy), color);
    }
}
