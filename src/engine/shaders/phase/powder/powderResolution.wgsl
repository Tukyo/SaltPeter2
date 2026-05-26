// Cell resolution logic. References globals `identityTexture`, `intentTexture`, `simMaterials` from sim.wgsl.

fn chooseIncomingPowderSourceFromIntent(
    targetCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32
) -> vec2f {
    let up   = vec2f(0.0,  gravityDirection);

    let sourceAbove      = targetCoord + up;
    let sourceAboveLeft  = targetCoord + up + CELL_LEFT;
    let sourceAboveRight = targetCoord + up + CELL_RIGHT;
    let sourceLeft       = targetCoord + CELL_LEFT;
    let sourceRight      = targetCoord + CELL_RIGHT;

    if materialIntentClaimsTarget(sourceAbove, targetCoord, res, gravityDirection) &&
       isRegisteredMaterialCoord(sourceAbove, res) {
        return sourceAbove;
    }

    let aboveLeftClaims  = materialIntentClaimsTarget(sourceAboveLeft,  targetCoord, res, gravityDirection) &&
                           isRegisteredMaterialCoord(sourceAboveLeft,  res);
    let aboveRightClaims = materialIntentClaimsTarget(sourceAboveRight, targetCoord, res, gravityDirection) &&
                           isRegisteredMaterialCoord(sourceAboveRight, res);

    if aboveLeftClaims && aboveRightClaims {
        let leftMat  = getPowderSimulationAtCoord(sourceAboveLeft,  res);
        let rightMat = getPowderSimulationAtCoord(sourceAboveRight, res);
        let fallSeed = getMaterialStepSeed(time, max(leftMat.fallRandomRate, rightMat.fallRandomRate));
        let rollSeed = hash(targetCoord + vec2f(fallSeed, fallSeed * RANDOM_DECORRELATION));
        return chooseWinningClaimant(
            sourceAboveLeft, sourceAboveRight,
            rollSeed
        );
    }

    if aboveLeftClaims  { return sourceAboveLeft; }
    if aboveRightClaims { return sourceAboveRight; }

    let leftClaims  = materialIntentClaimsTarget(sourceLeft,  targetCoord, res, gravityDirection) &&
                      isRegisteredMaterialCoord(sourceLeft,  res);
    let rightClaims = materialIntentClaimsTarget(sourceRight, targetCoord, res, gravityDirection) &&
                      isRegisteredMaterialCoord(sourceRight, res);

    if leftClaims && rightClaims {
        let leftMat    = getPowderSimulationAtCoord(sourceLeft,  res);
        let rightMat   = getPowderSimulationAtCoord(sourceRight, res);
        let settleSeed = getMaterialStepSeed(time, max(leftMat.settleRandomRate, rightMat.settleRandomRate));
        let rollSeed   = hash(targetCoord + vec2f(settleSeed, settleSeed * RANDOM_DECORRELATION));
        return chooseWinningClaimant(
            sourceLeft, sourceRight,
            rollSeed
        );
    }

    if leftClaims  { return sourceLeft; }
    if rightClaims { return sourceRight; }

    return INVALID_COORD;
}

fn resolvePowderCell(
    coord:                vec2f,
    res:                  vec2f,
    currentIdentityState: vec4f,
    gravityDirection:     f32,
    time:                 f32
) -> ResolvedCell {
    if gravityDirection == 0.0 { return ResolvedCell(currentIdentityState, coord); }

    let currentIsMaterial = isRegisteredMaterialState(currentIdentityState);

    if currentIsMaterial {
        let intentTarget = getMaterialIntentTargetAtCoord(coord, res, gravityDirection);

        if !sameCoord(intentTarget, coord) {
            let winningSource = chooseIncomingPowderSourceFromIntent(
                intentTarget, res, gravityDirection, time
            );

            if sameCoord(winningSource, coord) {
                let vacation = resolveDisplacerVacation(coord, intentTarget, currentIdentityState, res, gravityDirection);
                if !isRegisteredMaterialState(vacation.identityState) {
                    let targetIdentityState = textureLoad(identityTexture, vec2i(intentTarget));
                    if isOccupiedState(targetIdentityState) {
                        // Displaced powder must have actually won its own escape race
                        let targetIntentTarget = getMaterialIntentTargetAtCoord(intentTarget, res, gravityDirection);
                        if sameCoord(targetIntentTarget, intentTarget) {
                            return ResolvedCell(currentIdentityState, coord);
                        }
                        let targetWinner = chooseIncomingPowderSourceFromIntent(targetIntentTarget, res, gravityDirection, time);
                        if !sameCoord(targetWinner, intentTarget) {
                            return ResolvedCell(currentIdentityState, coord);
                        }
                    }
                    let fillSource = chooseIncomingPowderSourceFromIntent(coord, res, gravityDirection, time);
                    if isValidCoord(fillSource) { return ResolvedCell(textureLoad(identityTexture, vec2i(fillSource)), fillSource); }
                }
                return vacation;
            }
        }

        return ResolvedCell(currentIdentityState, coord);
    }

    let incomingSource = chooseIncomingPowderSourceFromIntent(
        coord, res, gravityDirection, time
    );

    if isValidCoord(incomingSource) {
        return ResolvedCell(textureLoad(identityTexture, vec2i(incomingSource)), incomingSource);
    }

    return ResolvedCell(currentIdentityState, coord);
}
