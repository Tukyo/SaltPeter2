fn isPowderAtCoord(coord: vec2f, res: vec2f) -> bool {
    if !inBounds(coord, res) { return false; }
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return isOccupiedState(identityState) && isMaterialPhaseId(getMaterialPhaseId(decodeMaterialId(identityState)), MATERIAL_PHASE_POWDER);
}

fn hasPowderClaimingTarget(targetCoord: vec2f, res: vec2f, gravityDirection: f32) -> bool {
    let up = vec2f(0.0, gravityDirection);
    let above = targetCoord + up;
    let aboveLeft = targetCoord + up + CELL_LEFT;
    let aboveRight = targetCoord + up + CELL_RIGHT;
    let left = targetCoord + CELL_LEFT;
    let right = targetCoord + CELL_RIGHT;
    if materialIntentClaimsTarget(above, targetCoord, res, gravityDirection) && isPowderAtCoord(above, res) { return true; }
    if materialIntentClaimsTarget(aboveLeft, targetCoord, res, gravityDirection) && isPowderAtCoord(aboveLeft, res) { return true; }
    if materialIntentClaimsTarget(aboveRight, targetCoord, res, gravityDirection) && isPowderAtCoord(aboveRight, res) { return true; }
    if materialIntentClaimsTarget(left, targetCoord, res, gravityDirection) && isPowderAtCoord(left, res) { return true; }
    if materialIntentClaimsTarget(right, targetCoord, res, gravityDirection) && isPowderAtCoord(right, res) { return true; }
    return false;
}

fn chooseIncomingLiquidSourceFromIntent(
    targetCoord: vec2f,
    res: vec2f,
    gravityDirection: f32,
    time: f32
) -> vec2f {
    let up = vec2f(0.0, gravityDirection);

    let sourceAbove = targetCoord + up;
    let sourceAboveLeft = targetCoord + up + CELL_LEFT;
    let sourceAboveRight = targetCoord + up + CELL_RIGHT;
    let sourceLeft = targetCoord + CELL_LEFT;
    let sourceRight = targetCoord + CELL_RIGHT;

    // Liquid falling straight down
    if materialIntentClaimsTarget(sourceAbove, targetCoord, res, gravityDirection) &&
       isLiquidPhaseCoord(sourceAbove, res) {
        return sourceAbove;
    }

    // Liquid falling diagonally
    let diagLeftClaims = materialIntentClaimsTarget(sourceAboveLeft, targetCoord, res, gravityDirection) &&
                          isLiquidPhaseCoord(sourceAboveLeft, res);
    let diagRightClaims = materialIntentClaimsTarget(sourceAboveRight, targetCoord, res, gravityDirection) &&
                          isLiquidPhaseCoord(sourceAboveRight, res);

    if diagLeftClaims && diagRightClaims {
        let sim = getLiquidSimulationAtCoord(sourceAboveLeft, res);
        let seed = getMaterialStepSeed(time, sim.flowRandomRate);
        let roll = hash(targetCoord + vec2f(seed, seed * RANDOM_DECORRELATION));
        return chooseWinningClaimant(sourceAboveLeft, sourceAboveRight, roll);
    }
    if diagLeftClaims { return sourceAboveLeft; }
    if diagRightClaims { return sourceAboveRight; }

    // Liquid spreading laterally
    let lateralLeftClaims = materialIntentClaimsTarget(sourceLeft, targetCoord, res, gravityDirection) &&
                             isLiquidPhaseCoord(sourceLeft, res);
    let lateralRightClaims = materialIntentClaimsTarget(sourceRight, targetCoord, res, gravityDirection) &&
                             isLiquidPhaseCoord(sourceRight, res);

    if lateralLeftClaims && lateralRightClaims {
        let sim = getLiquidSimulationAtCoord(sourceLeft, res);
        let seed = getMaterialStepSeed(time, sim.flowRandomRate);
        let roll = hash(targetCoord + vec2f(seed * 2.0, seed * RANDOM_DECORRELATION));
        return chooseWinningClaimant(sourceLeft, sourceRight, roll);
    }
    if lateralLeftClaims { return sourceLeft; }
    if lateralRightClaims { return sourceRight; }

    // Liquid rising (displacement escape — liquid pushed upward into this empty cell)
    let sourceBelow = targetCoord + vec2f(0.0, -gravityDirection);
    if materialIntentClaimsTarget(sourceBelow, targetCoord, res, gravityDirection) &&
       isLiquidPhaseCoord(sourceBelow, res) {
        return sourceBelow;
    }

    return INVALID_COORD;
}

fn resolveLiquidCell(
    coord: vec2f,
    res: vec2f,
    currentIdentityState: vec4f,
    gravityDirection: f32,
    time: f32
) -> ResolvedCell {
    if gravityDirection == 0.0 { return ResolvedCell(currentIdentityState, coord); }

    let down = vec2f(0.0, -gravityDirection);
    let gasBelow = coord + down;
    if inBounds(gasBelow, res) && isGasPhaseCoord(gasBelow, res) {
        let gasIntentTarget = getMaterialIntentTargetAtCoord(gasBelow, res, gravityDirection);
        if sameCoord(gasIntentTarget, coord) {
            let winningGasSource = chooseIncomingGasSourceFromIntent(coord, res, gravityDirection, time);
            if sameCoord(winningGasSource, gasBelow) {
                return ResolvedCell(textureLoad(identityTexture, vec2i(gasBelow)), gasBelow);
            }
        }
    }

    let intentTarget = getMaterialIntentTargetAtCoord(coord, res, gravityDirection);

    if !sameCoord(intentTarget, coord) {
        let winningSource = chooseIncomingLiquidSourceFromIntent(
            intentTarget, res, gravityDirection, time
        );
        if sameCoord(winningSource, coord) {
            // If target is empty, yield if a powder is also claiming it.
            // resolveEmptyCellFromPhaseIntents gives powder priority over liquid, so if we
            // vacate here while powder fills the target, this cell disappears.
            let targetIdentityState = textureLoad(identityTexture, vec2i(intentTarget));
            if !isOccupiedState(targetIdentityState) && hasPowderClaimingTarget(intentTarget, res, gravityDirection) {
                return ResolvedCell(currentIdentityState, coord);
            }

            let vacation = resolveDisplacerVacation(coord, intentTarget, currentIdentityState, res, gravityDirection);
            if !isRegisteredMaterialState(vacation.identityState) {
                let fillSource = chooseIncomingLiquidSourceFromIntent(coord, res, gravityDirection, time);
                if isValidCoord(fillSource) { return ResolvedCell(textureLoad(identityTexture, vec2i(fillSource)), fillSource); }
            }
            return vacation;
        }
    }

    return ResolvedCell(currentIdentityState, coord);
}
