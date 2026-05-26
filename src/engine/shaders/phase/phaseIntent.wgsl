// Intent dispatch. Used only by the intent compute pass.
// Calls per-phase intent choosers defined in phase/*/[phase]Intent.wgsl.

fn chooseIntentForState(
    coord:            vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    currentState:     vec4f
) -> f32 {
    if gravityDirection == 0.0 || !isRegisteredMaterialState(currentState) || isStaticCell(currentState) {
        return MATERIAL_INTENT_STAY;
    }

    let phaseId = getStatePhaseId(currentState);
    let above = coord + vec2f(0.0, gravityDirection);
    if inBounds(above, res) {
        let aboveState   = textureLoad(identityTexture, vec2i(above));
        let abovePhaseId = getMaterialPhaseId(getStateMaterialId(aboveState));
        if isOccupiedState(aboveState) && isDisplaceablePhase(abovePhaseId) && canDisplace(aboveState, currentState) {
            let allowRise = isMaterialPhaseId(phaseId, MATERIAL_PHASE_LIQUID) || isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS);

            // Gas rises directly into the displacing gas above, gated by its own rise chance.
            if isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS) {
                let gasSim    = getGasSimulation(getStateMaterialId(currentState));
                let riseRoll  = hash(coord + vec2f(fract(time * 3.7), fract(time * 5.3)));
                let riseProb  = 1.0 - exp(-gasSim.upwardRiseChance * uniforms.deltaTime);
                if riseRoll < riseProb {
                    return getMaterialIntentCodeForTarget(coord, above, gravityDirection);
                }
                return chooseGasIntentForState(coord, res, gravityDirection, time, currentState);
            }

            // Mirror the thickness roll the displacer runs — if blocked this tick, don't escape.
            if allowRise {
                let sim  = getLiquidSimulation(getStateMaterialId(currentState));
                let roll = hash(above + vec2f(fract(time * 7.3), fract(time * 11.9)));
                if roll < sim.thickness { return chooseLiquidIntentForState(coord, res, gravityDirection, time, currentState); }
            }

            let escapeTarget = chooseDisplacementEscapeTarget(coord, res, gravityDirection, allowRise);
            return getMaterialIntentCodeForTarget(coord, escapeTarget, gravityDirection);
        }
    }

    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_SOLID)  { return chooseSolidIntentForState(coord, res, gravityDirection, time, currentState); }
    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_POWDER) { return choosePowderIntentForState(coord, res, gravityDirection, time, currentState); }
    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_LIQUID) { return chooseLiquidIntentForState(coord, res, gravityDirection, time, currentState); }
    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS)    { return chooseGasIntentForState(coord, res, gravityDirection, time, currentState); }
    if isMaterialPhaseId(phaseId, MATERIAL_PHASE_FIRE)   { return chooseFireIntentForState(coord, res, gravityDirection, time, currentState); }

    return MATERIAL_INTENT_STAY;
}
