struct VertexOut {
    @builtin(position) pos: vec4f,
    @location(0)       uv:  vec2f,
}

struct CropUniform {
    offsetU: f32,
    offsetV: f32,
    scaleU:  f32,
    scaleV:  f32,
}

@group(0) @binding(0) var simTexture:         texture_2d<f32>;
@group(0) @binding(1) var gameObjectsTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> crop:      CropUniform;

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOut {
    let x  = f32((vi << 1u) & 2u) * 2.0 - 1.0;
    let y  = f32(vi & 2u) * 2.0 - 1.0;
    let uv = vec2f((x + 1.0) * 0.5, (y + 1.0) * 0.5);
    return VertexOut(vec4f(x, y, 0.0, 1.0), uv);
}

// Porter-Duff "over" for non-premultiplied straight alpha.
// Places src on top of dst.
fn alphaOver(dst: vec4f, src: vec4f) -> vec4f {
    let outAlpha = src.a + dst.a * (1.0 - src.a);
    let outRGB   = (src.rgb * src.a + dst.rgb * dst.a * (1.0 - src.a)) / max(outAlpha, 0.0001);
    return vec4f(outRGB, outAlpha);
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
    let texDim = vec2f(textureDimensions(simTexture, 0));
    let coordF = vec2f(
        crop.offsetU + in.uv.x * crop.scaleU,
        crop.offsetV + in.uv.y * crop.scaleV
    ) * texDim;
    let coord = vec2i(i32(coordF.x), i32(coordF.y));

    let goColor  = textureLoad(gameObjectsTexture, coord, 0);
    let simColor = textureLoad(simTexture,         coord, 0);

    // Composite bottom to top: GOs behind, sim on top.
    // Sim cells with alpha < 1 (e.g. water) allow GOs to show through.
    var color = goColor;
    color = alphaOver(color, simColor);
    return color;
}
