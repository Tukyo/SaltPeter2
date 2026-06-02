// Resolves the GameObject layer identity texture into RGBA color for the game objects layer.
// Reads goIdentityTexture + material color table, writes resolved RGBA to gameObjectsTexture.
// Output is consumed by CompositePass — nothing else should read gameObjectsTexture.

@group(0) @binding(0) var goIdentityTexture: texture_2d<f32>;
@group(0) @binding(1) var<storage, read> materials: array<VisualEntry>;
@group(0) @binding(2) var gameObjectsTexture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(WG_SIZE, WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let dims = textureDimensions(goIdentityTexture);
    if (id.x >= dims.x || id.y >= dims.y) { return; }

    let coord = vec2<i32>(i32(id.x), i32(id.y));
    let identityState = textureLoad(goIdentityTexture, coord, 0);

    if (!isOccupiedState(identityState)) {
        textureStore(gameObjectsTexture, coord, vec4<f32>(0.0));
        return;
    }

    let materialId    = i32(decodeMaterialId(identityState));
    let colorSeed     = decodeColorSeed(identityState);
    let variantId     = i32(decodeVariantId(identityState));
    let localColorIdx = i32(floor(clamp(colorSeed, 0.0, 0.999999) * COLORS_PER_MATERIAL));
    let colorIdx      = variantId * i32(COLORS_PER_MATERIAL) + localColorIdx;

    textureStore(gameObjectsTexture, coord, materials[materialId].colors[colorIdx]);
}
