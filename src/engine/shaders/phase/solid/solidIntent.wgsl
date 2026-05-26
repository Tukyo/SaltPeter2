fn getSolidCohesionAnchorCount(coord: vec2f, res: vec2f, materialId: f32) -> i32 {
    let offsets = cardinalOffsets();
    var count: i32 = 0;
    for (var i = 0u; i < 4u; i++) {
        count += select(0, 1, isSameMaterialCoord(coord + offsets[i], res, materialId));
    }
    return count;
}

fn shouldSolidCohere(
    sourceCoord: vec2f,
    res:         vec2f,
    fallSeed:    f32,
    material:    SolidSimulation
) -> bool {
    let sourceState = textureLoad(identityTexture, vec2i(sourceCoord));
    let materialId  = getStateMaterialId(sourceState);
    let anchorCount = getSolidCohesionAnchorCount(sourceCoord, res, materialId);

    if anchorCount <= 0 { return false; }

    let cohesionRoll  = hash(sourceCoord + vec2f(fallSeed * 15.37, fallSeed * 16.91));
    let cohesionChance = clamp(
        material.cohesionChance + (f32(anchorCount) * material.cohesionNeighborBonus),
        0.0,
        material.maxCohesionChance
    );

    return cohesionRoll < cohesionChance;
}

fn isValidSolidSlideTarget(targetCoord: vec2f, res: vec2f, gravityDirection: f32) -> bool {
    let down        = vec2f(0.0, -gravityDirection);
    let belowTarget = targetCoord + down;
    return isAirCoord(targetCoord, res) && isAirCoord(belowTarget, res);
}

fn chooseSolidTarget(
    sourceCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    material:         SolidSimulation
) -> vec2f {
    if material.fallRandomRate <= 0.0 { return sourceCoord; }

    let down  = vec2f(0.0, -gravityDirection);
    let below = sourceCoord + down;

    if isAirCoord(below, res) { return below; }

    if inBounds(below, res) {
        let belowState   = textureLoad(identityTexture, vec2i(below));
        let myState      = textureLoad(identityTexture, vec2i(sourceCoord));
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

    let fallSeed = getMaterialStepSeed(time, material.fallRandomRate);

    if shouldSolidCohere(sourceCoord, res, fallSeed, material) { return sourceCoord; }

    let slideRoll = hash(sourceCoord + vec2f(fallSeed * 11.47, fallSeed * 12.79));

    if slideRoll < material.lateralSpreadChance {
        let left           = sourceCoord + CELL_LEFT;
        let right          = sourceCoord + CELL_RIGHT;
        let sideRoll       = hash(sourceCoord + vec2f(fallSeed * 13.17, fallSeed * 14.53));
        let vx             = textureLoad(physicsTexture, vec2i(sourceCoord)).b;
        let biasedSideRoll = clamp(sideRoll - vx / MAX_VELOCITY * 0.5, 0.0, 1.0);
        let leftValid      = isValidSolidSlideTarget(left,  res, gravityDirection);
        let rightValid     = isValidSolidSlideTarget(right, res, gravityDirection);
        let slideTarget = chooseRandomValidTarget(left, right, biasedSideRoll, leftValid, rightValid);

        if isValidCoord(slideTarget) { return slideTarget; }
    }

    return sourceCoord;
}

fn chooseSolidTargetForState(
    sourceCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    sourceState:      vec4f
) -> vec2f {
    return chooseSolidTarget(
        sourceCoord,
        res,
        gravityDirection,
        time,
        getSolidSimulation(getStateMaterialId(sourceState))
    );
}

fn chooseSolidIntentForState(
    coord:            vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    currentState:     vec4f
) -> f32 {
    let targetCoord = chooseSolidTargetForState(coord, res, gravityDirection, time, currentState);
    return getMaterialIntentCodeForTarget(coord, targetCoord, gravityDirection);
}
