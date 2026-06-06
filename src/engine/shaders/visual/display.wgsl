// common.wgsl is prepended at runtime — isOccupiedState, decodeMaterialId, decodeColorSeed are available.

struct VertexOut {
    @builtin(position) pos: vec4f,
    @location(0)       uv: vec2f,
}

struct CropUniform {
    offsetU: f32,
    offsetV: f32,
    scaleU: f32,
    scaleV: f32,
}

@group(0) @binding(0) var identityTexture: texture_2d<f32>;
@group(0) @binding(1) var<storage, read> materials: array<VisualEntry>;
@group(0) @binding(2) var<uniform> crop: CropUniform;

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOut {
    let x = f32((vi << 1u) & 2u) * 2.0 - 1.0;
    let y = f32(vi & 2u) * 2.0 - 1.0;
    let uv = vec2f((x + 1.0) * 0.5, (y + 1.0) * 0.5);
    return VertexOut(vec4f(x, y, 0.0, 1.0), uv);
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
    let texDim = vec2f(textureDimensions(identityTexture, 0));
    let coordF = vec2f(crop.offsetU + in.uv.x * crop.scaleU, crop.offsetV + in.uv.y * crop.scaleV) * texDim;
    let coord = vec2i(i32(coordF.x), i32(coordF.y));
    let identityState = textureLoad(identityTexture, coord, 0);

    if !isOccupiedState(identityState) {
        return vec4f(0.0);
    }

    let materialId = i32(decodeMaterialId(identityState));
    let colorSeed = decodeColorSeed(identityState);
    let variantId = i32(decodeVariantId(identityState));
    let localColorIdx = i32(floor(clamp(colorSeed, 0.0, 0.999999) * COLORS_PER_MATERIAL));
    let colorIdx = variantId * i32(COLORS_PER_MATERIAL) + localColorIdx;

    return materials[materialId].colors[colorIdx];
}
