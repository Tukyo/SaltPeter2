fn chooseIncomingGasSourceFromIntent(
    targetCoord: vec2f,
    res: vec2f,
    gravityDirection: f32,
    time: f32
) -> vec2f {
    let up = vec2f(0.0, gravityDirection);
    let down = vec2f(0.0, -gravityDirection);

    // Gas sinking down (denser gas displacing lighter gas below it)
    let sourceAbove = targetCoord + up;
    if materialIntentClaimsTarget(sourceAbove, targetCoord, res, gravityDirection) &&
       isGasPhaseCoord(sourceAbove, res) {
        return sourceAbove;
    }

    // Gas rising straight up into this cell
    let sourceBelow = targetCoord + down;
    if materialIntentClaimsTarget(sourceBelow, targetCoord, res, gravityDirection) &&
       isGasPhaseCoord(sourceBelow, res) {
        return sourceBelow;
    }

    // Gas rising diagonally into this cell
    let sourceBelowLeft = targetCoord + down + CELL_LEFT;
    let sourceBelowRight = targetCoord + down + CELL_RIGHT;
    let diagLeftClaims = materialIntentClaimsTarget(sourceBelowLeft, targetCoord, res, gravityDirection) && isGasPhaseCoord(sourceBelowLeft, res);
    let diagRightClaims = materialIntentClaimsTarget(sourceBelowRight, targetCoord, res, gravityDirection) && isGasPhaseCoord(sourceBelowRight, res);

    if diagLeftClaims && diagRightClaims {
        let sim = getGasSimulationAtCoord(sourceBelowLeft, res);
        let seed = getMaterialStepSeed(time, sim.riseRandomRate);
        let roll = hash(targetCoord + vec2f(seed, seed * RANDOM_DECORRELATION));
        return chooseWinningClaimant(sourceBelowLeft, sourceBelowRight, roll);
    }
    if diagLeftClaims { return sourceBelowLeft; }
    if diagRightClaims { return sourceBelowRight; }

    // Gas spreading laterally into this cell
    let sourceLeft = targetCoord + CELL_LEFT;
    let sourceRight = targetCoord + CELL_RIGHT;
    let lateralLeftClaims = materialIntentClaimsTarget(sourceLeft, targetCoord, res, gravityDirection) && isGasPhaseCoord(sourceLeft, res);
    let lateralRightClaims = materialIntentClaimsTarget(sourceRight, targetCoord, res, gravityDirection) && isGasPhaseCoord(sourceRight, res);

    if lateralLeftClaims && lateralRightClaims {
        let sim = getGasSimulationAtCoord(sourceLeft, res);
        let seed = getMaterialStepSeed(time, sim.spreadRandomRate);
        let roll = hash(targetCoord + vec2f(seed * 2.0, seed * RANDOM_DECORRELATION));
        return chooseWinningClaimant(sourceLeft, sourceRight, roll);
    }
    if lateralLeftClaims { return sourceLeft; }
    if lateralRightClaims { return sourceRight; }

    return INVALID_COORD;
}

fn resolveGasCell(
    coord: vec2f,
    res: vec2f,
    currentIdentityState: vec4f,
    gravityDirection: f32,
    time: f32
) -> ResolvedCell {
    if gravityDirection == 0.0 { return ResolvedCell(currentIdentityState, coord); }

    let sim = getGasSimulation(getStateMaterialId(currentIdentityState));
    let stateBase = getMaterialStateBase(getStateMaterialId(currentIdentityState));
    let matLifetime = materialStates[stateBase].lifetime;
    let cellState = textureLoad(cellStateTexture, vec2i(coord));
    let lifetimeActive = matLifetime > 0.0 && cellState.g > 0.0;

    // Dissipation only fires once lifetime has expired (or for immortal gases with no lifetime).
    if !lifetimeActive {
        let dissipRoll = timeHash(coord, time);
        let probability = 1.0 - exp(-sim.dissipationChance * uniforms.deltaTime);
        if dissipRoll < probability {
            return ResolvedCell(AIR_STATE, coord);
        }
    }

    let intentTarget = getMaterialIntentTargetAtCoord(coord, res, gravityDirection);

    if !sameCoord(intentTarget, coord) {
        let winningSource = chooseIncomingGasSourceFromIntent(intentTarget, res, gravityDirection, time);
        if sameCoord(winningSource, coord) {
            let targetState = textureLoad(identityTexture, vec2i(intentTarget));
            if isOccupiedState(targetState) {
                if isLiquidPhaseCoord(intentTarget, res) {
                    return ResolvedCell(targetState, intentTarget);
                }
                return resolveDisplacerVacation(coord, intentTarget, currentIdentityState, res, gravityDirection);
            }
            return ResolvedCell(AIR_STATE, coord);
        }
    }

    return ResolvedCell(currentIdentityState, coord);
}
