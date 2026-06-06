// Physics metadata helpers. References global `physicsMaterials` declared in the main shader.

fn isMaterialPhaseId(phaseId: f32, expected: f32) -> bool {
    return abs(phaseId - expected) < 0.5;
}

fn getMaterialPhaseId(materialId: f32) -> f32 {
    let idx = clamp(i32(floor(materialId + 0.5)), 0, MATERIAL_COUNT - 1);
    return physicsMaterials[idx].phaseId;
}

fn getStatePhaseId(identityState: vec4f) -> f32 {
    return getMaterialPhaseId(getStateMaterialId(identityState));
}

fn isLiquidOrGasPhase(phaseId: f32) -> bool {
    return isMaterialPhaseId(phaseId, MATERIAL_PHASE_LIQUID) ||
           isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS);
}

fn isDisplaceablePhase(phaseId: f32) -> bool {
    return isMaterialPhaseId(phaseId, MATERIAL_PHASE_LIQUID) ||
           isMaterialPhaseId(phaseId, MATERIAL_PHASE_POWDER) ||
           isMaterialPhaseId(phaseId, MATERIAL_PHASE_SOLID)  ||
           isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS);
}
