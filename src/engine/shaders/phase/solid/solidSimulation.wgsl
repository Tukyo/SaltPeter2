fn getSolidSimulation(materialId: f32) -> SolidSimulation {
    let base = getMaterialSimulationBase(materialId);
    return SolidSimulation(
        materialSimulationData[base + 0u],
        materialSimulationData[base + 1u],
        materialSimulationData[base + 2u],
        materialSimulationData[base + 3u],
        materialSimulationData[base + 4u]
    );
}

fn getSolidSimulationAtCoord(coord: vec2f, res: vec2f) -> SolidSimulation {
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return getSolidSimulation(getStateMaterialId(identityState));
}
