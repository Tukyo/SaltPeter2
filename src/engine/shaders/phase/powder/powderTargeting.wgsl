// Target selection logic. References global `identityTexture` and `simMaterials` declared in the main shader.

fn shouldPowderCohere(
    sourceCoord:    vec2f,
    res:            vec2f,
    time:           f32,
    material:       PowderSimulation,
    hasOpenSurface: bool
) -> bool {
    if !hasOpenSurface { return false; }

    let sourceState = textureLoad(identityTexture, vec2i(sourceCoord));
    let materialId  = getStateMaterialId(sourceState);
    let anchorCount = getPowderCohesionAnchorCount(sourceCoord, res, materialId);

    if anchorCount <= 0 { return false; }

    let fallSeed      = getMaterialStepSeed(time, material.fallRandomRate);
    let cohesionRoll  = hash(sourceCoord + vec2f(fallSeed * 15.37, fallSeed * 16.91));
    let cohesionChance = clamp(
        material.cohesionChance + (f32(anchorCount) * material.cohesionNeighborBonus),
        0.0,
        material.maxCohesionChance
    );

    return cohesionRoll < cohesionChance;
}

fn choosePowderSettleTarget(
    sourceCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    material:         PowderSimulation,
    hasOpenSurface:   bool
) -> vec2f {
    let settleSeed = getMaterialStepSeed(time, material.settleRandomRate);
    let stayRoll   = hash(sourceCoord + vec2f(settleSeed, settleSeed * RANDOM_DECORRELATION));

    if stayRoll < material.settleStayChance { return sourceCoord; }

    let surfaceRoll = hash(sourceCoord + vec2f(settleSeed * 2.17, settleSeed * 3.31));

    if surfaceRoll < material.settleSurfaceRequireChance && !hasOpenSurface { return sourceCoord; }

    let tryRoll  = hash(sourceCoord + vec2f(settleSeed * 4.13, settleSeed * 5.71));
    let tryChance = clamp(
        material.settleTryChance + select(0.0, material.exposedSettleBonus, hasOpenSurface),
        0.0,
        1.0
    );

    if tryRoll > tryChance { return sourceCoord; }

    let surfaceSlideRoll = hash(sourceCoord + vec2f(settleSeed * 6.91, settleSeed * 8.23));

    if surfaceSlideRoll < material.surfaceSlideChance {
        let left      = sourceCoord + CELL_LEFT;
        let right     = sourceCoord + CELL_RIGHT;
        let sideRoll  = hash(sourceCoord + vec2f(settleSeed * 9.37, settleSeed * 10.91));
        let leftValid  = isValidPowderSurfaceSlideTarget(left,  res, gravityDirection);
        let rightValid = isValidPowderSurfaceSlideTarget(right, res, gravityDirection);
        let slideTarget = chooseRandomValidTarget(left, right, sideRoll, leftValid, rightValid);

        if isValidCoord(slideTarget) { return slideTarget; }
    }

    let spreadRoll = hash(sourceCoord + vec2f(settleSeed * 11.47, settleSeed * 12.79));

    if spreadRoll > material.lateralSpreadChance { return sourceCoord; }

    let left      = sourceCoord + CELL_LEFT;
    let right     = sourceCoord + CELL_RIGHT;
    let sideRoll  = hash(sourceCoord + vec2f(settleSeed * 13.17, settleSeed * 14.53));
    let leftValid  = isValidPowderSettleTarget(left,  res, gravityDirection);
    let rightValid = isValidPowderSettleTarget(right, res, gravityDirection);
    let chosenTarget = chooseRandomValidTarget(left, right, sideRoll, leftValid, rightValid);

    if isValidCoord(chosenTarget) { return chosenTarget; }

    return sourceCoord;
}

fn choosePowderTarget(
    sourceCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    material:         PowderSimulation
) -> vec2f {
    if !canPowderMove(material) { return sourceCoord; }

    let down       = vec2f(0.0, -gravityDirection);
    let below      = sourceCoord + down;
    let belowLeft  = sourceCoord + down + CELL_LEFT;
    let belowRight = sourceCoord + down + CELL_RIGHT;

    if isAirCoord(below, res) { return below; }

    let fallSeed       = getMaterialStepSeed(time, material.fallRandomRate);
    let hasOpenSurface = hasOpenSurfaceAbove(sourceCoord, res, gravityDirection);
    let diagonalRoll   = hash(sourceCoord + vec2f(fallSeed, fallSeed * RANDOM_DECORRELATION));

    if diagonalRoll < material.diagonalFallChance {
        let sideRoll    = hash(sourceCoord + vec2f(fallSeed * 2.17, fallSeed * 3.31));
        let vx          = textureLoad(physicsTexture, vec2i(sourceCoord)).b;
        let biasedRoll  = clamp(sideRoll - vx / MAX_VELOCITY * 0.5, 0.0, 1.0);
        let leftValid   = isAirCoord(belowLeft,  res);
        let rightValid  = isAirCoord(belowRight, res);
        let diagonalTarget = chooseRandomValidTarget(belowLeft, belowRight, biasedRoll, leftValid, rightValid);

        if shouldPowderCohere(sourceCoord, res, time, material, hasOpenSurface) {
            return sourceCoord;
        }

        if isValidCoord(diagonalTarget) { return diagonalTarget; }
    }

    // Displacement fall: sink into a lighter occupied cell if it has an escape route
    if inBounds(below, res) {
        let belowState = textureLoad(identityTexture, vec2i(below));
        let myState    = textureLoad(identityTexture, vec2i(sourceCoord));
        if isOccupiedState(belowState) && canDisplace(myState, belowState) {
            let belowPhaseId = getMaterialPhaseId(getStateMaterialId(belowState));
            let allowRise    = isMaterialPhaseId(belowPhaseId, MATERIAL_PHASE_LIQUID);
            if hasDisplacementEscapeRoute(below, res, gravityDirection, allowRise) {
                var canSink = true;
                if allowRise {
                    let liquidSim = getLiquidSimulation(getStateMaterialId(belowState));
                    let roll      = hash(sourceCoord + vec2f(fract(time * 7.3), fract(time * 11.9)));
                    canSink = roll >= liquidSim.thickness;
                }
                if canSink { return below; }
            }
        }
    }

    return choosePowderSettleTarget(sourceCoord, res, gravityDirection, time, material, hasOpenSurface);
}

fn choosePowderTargetForState(
    sourceCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    sourceState:      vec4f
) -> vec2f {
    return choosePowderTarget(
        sourceCoord,
        res,
        gravityDirection,
        time,
        getPowderSimulation(getStateMaterialId(sourceState))
    );
}
