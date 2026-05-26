fn getLiquidSimulation(materialId: f32) -> LiquidSimulation {
    let base = getMaterialSimulationBase(materialId);
    return LiquidSimulation(
        materialSimulationData[base + 0u],
        materialSimulationData[base + 1u],
        materialSimulationData[base + 2u],
        materialSimulationData[base + 3u],
        materialSimulationData[base + 4u],
        materialSimulationData[base + 5u],
        materialSimulationData[base + 6u],
        materialSimulationData[base + 7u],
        materialSimulationData[base + 8u],
        materialSimulationData[base + 9u],
        materialSimulationData[base + 10u]
    );
}

fn getLiquidSimulationAtCoord(coord: vec2f, res: vec2f) -> LiquidSimulation {
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return getLiquidSimulation(getStateMaterialId(identityState));
}

fn isLiquidPhaseCoord(coord: vec2f, res: vec2f) -> bool {
    if !inBounds(coord, res) { return false; }
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return isOccupiedState(identityState) && isMaterialPhaseId(getStatePhaseId(identityState), MATERIAL_PHASE_LIQUID);
}
