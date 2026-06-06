fn chooseIncomingFireSourceFromIntent(
    targetCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32
) -> vec2f {
    let up = vec2f(0.0, gravityDirection);

    let sourceAbove      = targetCoord + up;
    let sourceAboveLeft  = targetCoord + up + CELL_LEFT;
    let sourceAboveRight = targetCoord + up + CELL_RIGHT;
    let sourceLeft       = targetCoord + CELL_LEFT;
    let sourceRight      = targetCoord + CELL_RIGHT;

    if materialIntentClaimsTarget(sourceAbove, targetCoord, res, gravityDirection) &&
       isFirePhaseCoord(sourceAbove, res) {
        return sourceAbove;
    }

    let aboveLeftClaims  = materialIntentClaimsTarget(sourceAboveLeft,  targetCoord, res, gravityDirection) &&
                           isFirePhaseCoord(sourceAboveLeft,  res);
    let aboveRightClaims = materialIntentClaimsTarget(sourceAboveRight, targetCoord, res, gravityDirection) &&
                           isFirePhaseCoord(sourceAboveRight, res);

    if aboveLeftClaims && aboveRightClaims {
        let leftSim  = getFireSimulationAtCoord(sourceAboveLeft,  res);
        let rightSim = getFireSimulationAtCoord(sourceAboveRight, res);
        let fallSeed = getMaterialStepSeed(time, max(leftSim.fallRandomRate, rightSim.fallRandomRate));
        let rollSeed = hash(targetCoord + vec2f(fallSeed, fallSeed * RANDOM_DECORRELATION));
        return chooseWinningClaimant(sourceAboveLeft, sourceAboveRight, rollSeed);
    }
    if aboveLeftClaims  { return sourceAboveLeft; }
    if aboveRightClaims { return sourceAboveRight; }

    let leftClaims  = materialIntentClaimsTarget(sourceLeft,  targetCoord, res, gravityDirection) &&
                      isFirePhaseCoord(sourceLeft,  res);
    let rightClaims = materialIntentClaimsTarget(sourceRight, targetCoord, res, gravityDirection) &&
                      isFirePhaseCoord(sourceRight, res);

    if leftClaims && rightClaims {
        let leftSim    = getFireSimulationAtCoord(sourceLeft,  res);
        let rightSim   = getFireSimulationAtCoord(sourceRight, res);
        let settleSeed = getMaterialStepSeed(time, max(leftSim.settleRandomRate, rightSim.settleRandomRate));
        let rollSeed   = hash(targetCoord + vec2f(settleSeed, settleSeed * RANDOM_DECORRELATION));
        return chooseWinningClaimant(sourceLeft, sourceRight, rollSeed);
    }
    if leftClaims  { return sourceLeft; }
    if rightClaims { return sourceRight; }

    return INVALID_COORD;
}

fn resolveFireCell(
    coord:                vec2f,
    res:                  vec2f,
    currentIdentityState: vec4f,
    gravityDirection:     f32,
    time:                 f32
) -> ResolvedCell {
    if gravityDirection == 0.0 { return ResolvedCell(currentIdentityState, coord); }

    let sim         = getFireSimulation(getStateMaterialId(currentIdentityState));
    let stateBase   = getMaterialStateBase(getStateMaterialId(currentIdentityState));
    let matLifetime = materialStates[stateBase].lifetime;
    let cellState   = textureLoad(cellStateTexture, vec2i(coord));

    if matLifetime > 0.0 && cellState.g <= 0.0 {
        return ResolvedCell(AIR_STATE, coord);
    }

    let fireId        = getStateMaterialId(currentIdentityState);
    var hasFuel       = false;
    var hasAir        = false;
    let dissipOffsets = cardinalOffsets();
    for (var i = 0u; i < 4u; i++) {
        let n      = coord + dissipOffsets[i];
        let nState = select(vec4f(0.0), textureLoad(identityTexture, vec2i(n)), inBounds(n, res));
        if !isOccupiedState(nState) { hasAir = true; continue; }
        let nId = getStateMaterialId(nState);
        if isMaterialPhaseId(getMaterialPhaseId(nId), MATERIAL_PHASE_FIRE) { continue; }
        if isLiquidOrGasPhase(getMaterialPhaseId(nId)) { hasAir = true; }
        let rBase     = getReactionBase(fireId, nId);
        let rChance   = reactionLookup[rBase + 2u];
        let rProductA = reactionLookup[rBase + 0u];
        if rChance >= 0.0 && abs(rProductA - fireId) < 0.5 { hasFuel = true; }
    }
    if !hasAir { hasFuel = false; }

    if !hasFuel {
        let dissipRoll  = timeHash(coord, time);
        let probability = 1.0 - exp(-sim.dissipationChance * uniforms.deltaTime);
        if dissipRoll < probability {
            return ResolvedCell(AIR_STATE, coord);
        }
    }

    let intentTarget = getMaterialIntentTargetAtCoord(coord, res, gravityDirection);

    if !sameCoord(intentTarget, coord) {
        let winningSource = chooseIncomingFireSourceFromIntent(intentTarget, res, gravityDirection, time);
        if sameCoord(winningSource, coord) {
            let fillSource = chooseIncomingFireSourceFromIntent(coord, res, gravityDirection, time);
            if isValidCoord(fillSource) { return ResolvedCell(textureLoad(identityTexture, vec2i(fillSource)), fillSource); }
            return ResolvedCell(AIR_STATE, coord);
        }
    }

    return ResolvedCell(currentIdentityState, coord);
}
