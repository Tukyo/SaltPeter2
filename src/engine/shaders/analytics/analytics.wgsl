@group(0) @binding(0) var identityTexture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var<storage, read_write> materialCounts: array<atomic<u32>>;

@compute @workgroup_size(WG_SIZE, WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let dims = textureDimensions(identityTexture);
    if id.x >= dims.x || id.y >= dims.y { return; }

    let state = textureLoad(identityTexture, vec2i(id.xy));
    if !isOccupiedState(state) { return; }

    let matId = u32(clamp(i32(round(getStateMaterialId(state))), 0, MATERIAL_COUNT - 1));
    atomicAdd(&materialCounts[matId], 1u);
}
