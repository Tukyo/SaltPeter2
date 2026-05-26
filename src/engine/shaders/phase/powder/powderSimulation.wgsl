fn getPowderSimulation(materialId: f32) -> PowderSimulation {
    let base = getMaterialSimulationBase(materialId);
    return PowderSimulation(
        materialSimulationData[base +  0u],
        materialSimulationData[base +  1u],
        materialSimulationData[base +  2u],
        materialSimulationData[base +  3u],
        materialSimulationData[base +  4u],
        materialSimulationData[base +  5u],
        materialSimulationData[base +  6u],
        materialSimulationData[base +  7u],
        materialSimulationData[base +  8u],
        materialSimulationData[base +  9u],
        materialSimulationData[base + 10u],
        materialSimulationData[base + 11u]
    );
}

fn getPowderSimulationAtCoord(coord: vec2f, res: vec2f) -> PowderSimulation {
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return getPowderSimulation(getStateMaterialId(identityState));
}
