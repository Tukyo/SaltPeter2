// Resolution dispatch. Used only by the simulation compute pass.
// Calls per-phase resolution functions defined in phase/*/[phase]Resolution.wgsl.

fn resolveEmptyCellFromPhaseIntents(
    coord:            vec2f,
    res:              vec2f,
    currentIdentityState:     vec4f,
    gravityDirection: f32,
    time:             f32
) -> ResolvedCell {
    let incomingSolid = chooseIncomingSolidSourceFromIntent(coord, res, gravityDirection, time);
    if isValidCoord(incomingSolid) { return ResolvedCell(textureLoad(identityTexture, vec2i(incomingSolid)), incomingSolid); }

    let incomingPowder = chooseIncomingPowderSourceFromIntent(coord, res, gravityDirection, time);
    if isValidCoord(incomingPowder) { return ResolvedCell(textureLoad(identityTexture, vec2i(incomingPowder)), incomingPowder); }

    let incomingLiquid = chooseIncomingLiquidSourceFromIntent(coord, res, gravityDirection, time);
    if isValidCoord(incomingLiquid) { return ResolvedCell(textureLoad(identityTexture, vec2i(incomingLiquid)), incomingLiquid); }

    let incomingGas = chooseIncomingGasSourceFromIntent(coord, res, gravityDirection, time);
    if isValidCoord(incomingGas) { return ResolvedCell(textureLoad(identityTexture, vec2i(incomingGas)), incomingGas); }

    let incomingFire = chooseIncomingFireSourceFromIntent(coord, res, gravityDirection, time);
    if isValidCoord(incomingFire) { return ResolvedCell(textureLoad(identityTexture, vec2i(incomingFire)), incomingFire); }

    return ResolvedCell(currentIdentityState, coord);
}

fn resolveCellForState(
    coord:            vec2f,
    res:              vec2f,
    currentIdentityState:     vec4f,
    gravityDirection: f32,
    time:             f32
) -> ResolvedCell {
    if gravityDirection == 0.0 { return ResolvedCell(currentIdentityState, coord); }

    if !isRegisteredMaterialState(currentIdentityState) {
        return resolveEmptyCellFromPhaseIntents(coord, res, currentIdentityState, gravityDirection, time);
    }

    let phaseId = getStatePhaseId(currentIdentityState);

    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_SOLID)  { return resolveSolidCell(coord, res, currentIdentityState, gravityDirection, time); }
    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_POWDER) { return resolvePowderCell(coord, res, currentIdentityState, gravityDirection, time); }
    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_LIQUID) { return resolveLiquidCell(coord, res, currentIdentityState, gravityDirection, time); }
    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS)    { return resolveGasCell(coord, res, currentIdentityState, gravityDirection, time); }
    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_FIRE)   { return resolveFireCell(coord, res, currentIdentityState, gravityDirection, time); }

    return ResolvedCell(currentIdentityState, coord);
}
