fn getFireSimulation(materialId: f32) -> FireSimulation {
    let base = getMaterialSimulationBase(materialId);
    return FireSimulation(
        materialSimulationData[base + 0u],
        materialSimulationData[base + 1u],
        materialSimulationData[base + 2u],
        materialSimulationData[base + 3u],
        materialSimulationData[base + 4u],
        materialSimulationData[base + 5u],
        materialSimulationData[base + 6u],
    );
}

fn getFireSimulationAtCoord(coord: vec2f, res: vec2f) -> FireSimulation {
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return getFireSimulation(getStateMaterialId(identityState));
}

fn isFirePhaseCoord(coord: vec2f, res: vec2f) -> bool {
    if !inBounds(coord, res) { return false; }
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return isOccupiedState(identityState) && isMaterialPhaseId(getStatePhaseId(identityState), MATERIAL_PHASE_FIRE);
}
