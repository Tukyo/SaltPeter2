// Depends on: common.wgsl (isOccupiedState, decodeMaterialId, decodeColorSeed, makeMaterialState, makeMaterialStateSimple)

fn isMaterialId(materialId: f32, expected: f32) -> bool {
    return abs(materialId - expected) < 0.5;
}

fn isAirMaterial(materialId: f32) -> bool {
    return materialId < 0.5;
}

fn getStateMaterialId(identityState: vec4f) -> f32 {
    return decodeMaterialId(identityState);
}

fn getStateColorSeed(identityState: vec4f) -> f32 {
    return decodeColorSeed(identityState);
}

fn isRegisteredMaterialId(materialId: f32) -> bool {
    let id = floor(materialId + 0.5);
    return id >= 0.0 && id < f32(MATERIAL_COUNT);
}

fn isRegisteredMaterialState(identityState: vec4f) -> bool {
    return isOccupiedState(identityState) && isRegisteredMaterialId(getStateMaterialId(identityState));
}

fn makeState(materialId: f32) -> vec4f {
    return makeMaterialStateSimple(materialId, OCCUPANCY_DYNAMIC);
}

fn makeStateWithSeed(materialId: f32, colorSeed: f32) -> vec4f {
    return makeMaterialState(materialId, colorSeed, OCCUPANCY_DYNAMIC);
}

fn makeStateWithVariant(materialId: f32, colorSeed: f32, variantId: f32) -> vec4f {
    return vec4f(
        encodeMaterialId(materialId),
        encodeColorSeed(colorSeed),
        encodeVariantId(variantId),
        OCCUPANCY_DYNAMIC
    );
}
