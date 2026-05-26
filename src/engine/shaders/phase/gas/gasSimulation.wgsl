fn getGasSimulation(materialId: f32) -> GasSimulation {
    let base = getMaterialSimulationBase(materialId);
    return GasSimulation(
        materialSimulationData[base + 0u],
        materialSimulationData[base + 1u],
        materialSimulationData[base + 2u],
        materialSimulationData[base + 3u],
        materialSimulationData[base + 4u],
        materialSimulationData[base + 5u],
        materialSimulationData[base + 6u],
    );
}

fn getGasSimulationAtCoord(coord: vec2f, res: vec2f) -> GasSimulation {
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return getGasSimulation(getStateMaterialId(identityState));
}

fn isGasPhaseCoord(coord: vec2f, res: vec2f) -> bool {
    if !inBounds(coord, res) { return false; }
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return isOccupiedState(identityState) && isMaterialPhaseId(getStatePhaseId(identityState), MATERIAL_PHASE_GAS);
}
