fn getMaterialPatternOffset(materialId: f32) -> vec2f {
    return vec2f(materialId * 17.13, materialId * 29.47);
}

fn sampleMaterialPatternNoise(coord: vec2f, offset: vec2f) -> f32 {
    let cell  = floor(coord);
    let local = fract(coord);
    let blend = local * local * (3.0 - 2.0 * local);
    let bl = hash(cell + offset);
    let br = hash(cell + CELL_RIGHT + offset);
    let tl = hash(cell + vec2f(0.0, 1.0) + offset);
    let tr = hash(cell + vec2f(1.0, 1.0) + offset);
    return mix(mix(bl, br, blend.x), mix(tl, tr, blend.x), blend.y);
}

fn chooseMaterialColorSeed(materialId: f32, coord: vec2f) -> f32 {
    let offset = getMaterialPatternOffset(materialId);
    let blob   = sampleMaterialPatternNoise((coord / MATERIAL_PATTERN_BLOB_SCALE)   + offset * 0.31, offset * 1.11);
    let detail = sampleMaterialPatternNoise((coord / MATERIAL_PATTERN_DETAIL_SCALE) + offset * 0.53, offset * 2.27);
    let grain  = hash(coord + offset * 3.19);
    let total  = MATERIAL_PATTERN_BLOB_STRENGTH + MATERIAL_PATTERN_DETAIL_STRENGTH + MATERIAL_PATTERN_GRAIN_STRENGTH;
    return clamp(
        (blob * MATERIAL_PATTERN_BLOB_STRENGTH + detail * MATERIAL_PATTERN_DETAIL_STRENGTH + grain * MATERIAL_PATTERN_GRAIN_STRENGTH) / total,
        0.0, 0.999999
    );
}

fn makeBrushState(materialId: f32, coord: vec2f) -> vec4f {
    if isAirMaterial(materialId) { return AIR_STATE; }
    var state = makeStateWithVariant(materialId, chooseMaterialColorSeed(materialId, coord), brush.variantId);
    state.a = brush.occupancy / 255.0;
    return state;
}
