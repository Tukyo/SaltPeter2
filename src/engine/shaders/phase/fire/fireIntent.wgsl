fn canFireMove(material: FireSimulation) -> bool {
    return material.fallRandomRate > 0.0;
}

fn isValidFireGroundedTarget(coord: vec2f, res: vec2f, gravityDirection: f32) -> bool {
    if !isAirCoord(coord, res) { return false; }
    let below = coord + vec2f(0.0, -gravityDirection);
    return inBounds(below, res) && isOccupiedState(textureLoad(identityTexture, vec2i(below)));
}

fn chooseFireSettleTarget(
    sourceCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    material:         FireSimulation
) -> vec2f {
    let settleSeed = getMaterialStepSeed(time, material.settleRandomRate);
    let stayRoll   = hash(sourceCoord + vec2f(settleSeed, settleSeed * RANDOM_DECORRELATION));
    if stayRoll < material.settleStayChance { return sourceCoord; }

    let up  = vec2f(0.0, gravityDirection);
    let vx  = textureLoad(physicsTexture, vec2i(sourceCoord)).b;
    let vxBias = vx / MAX_VELOCITY * 0.5;

    // Surface slide: horizontal + up-slope (crawls over terrain)
    let slideRoll = hash(sourceCoord + vec2f(settleSeed * 2.17, settleSeed * 3.31));
    if slideRoll < material.surfaceSlideChance {
        let hLeft    = sourceCoord + CELL_LEFT;
        let hRight   = sourceCoord + CELL_RIGHT;
        let hRoll    = clamp(hash(sourceCoord + vec2f(settleSeed * 4.13, settleSeed * 5.71)) - vxBias, 0.0, 1.0);
        let hTarget  = chooseRandomValidTarget(hLeft, hRight, hRoll,
                           isValidFireGroundedTarget(hLeft,  res, gravityDirection),
                           isValidFireGroundedTarget(hRight, res, gravityDirection));
        if isValidCoord(hTarget) { return hTarget; }

        let uLeft    = sourceCoord + up + CELL_LEFT;
        let uRight   = sourceCoord + up + CELL_RIGHT;
        let uRoll    = clamp(hash(sourceCoord + vec2f(settleSeed * 6.91, settleSeed * 8.23)) - vxBias, 0.0, 1.0);
        let uTarget  = chooseRandomValidTarget(uLeft, uRight, uRoll,
                           isValidFireGroundedTarget(uLeft,  res, gravityDirection),
                           isValidFireGroundedTarget(uRight, res, gravityDirection));
        if isValidCoord(uTarget) { return uTarget; }
    }

    // Lateral spread: horizontal only, must be grounded
    let spreadRoll = hash(sourceCoord + vec2f(settleSeed * 9.37, settleSeed * 10.91));
    if spreadRoll > material.lateralSpreadChance { return sourceCoord; }

    let sLeft   = sourceCoord + CELL_LEFT;
    let sRight  = sourceCoord + CELL_RIGHT;
    let sRoll   = clamp(hash(sourceCoord + vec2f(settleSeed * 11.47, settleSeed * 12.79)) - vxBias, 0.0, 1.0);
    let sTarget = chooseRandomValidTarget(sLeft, sRight, sRoll,
                      isValidFireGroundedTarget(sLeft,  res, gravityDirection),
                      isValidFireGroundedTarget(sRight, res, gravityDirection));
    if isValidCoord(sTarget) { return sTarget; }

    return sourceCoord;
}

fn chooseFireTarget(
    sourceCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    material:         FireSimulation
) -> vec2f {
    if !canFireMove(material) { return sourceCoord; }

    let down       = vec2f(0.0, -gravityDirection);
    let below      = sourceCoord + down;
    let belowLeft  = sourceCoord + down + CELL_LEFT;
    let belowRight = sourceCoord + down + CELL_RIGHT;

    // Cling to any adjacent solid surface — chance controlled by settleStayChance.
    let clingRoll = hash(sourceCoord + vec2f(fract(time * 7.31), fract(time * 11.93)));
    let fireId    = getStateMaterialId(textureLoad(identityTexture, vec2i(sourceCoord)));
    let neighbors = array<vec2f, 4>(
        below,
        sourceCoord + vec2f(0.0, gravityDirection),
        sourceCoord + CELL_LEFT,
        sourceCoord + CELL_RIGHT,
    );
    for (var i = 0; i < 4; i++) {
        let n = neighbors[i];
        if inBounds(n, res) {
            let nState = textureLoad(identityTexture, vec2i(n));
            if isOccupiedState(nState) && !isFirePhaseCoord(n, res) {
                let rBase  = getReactionBase(fireId, getStateMaterialId(nState));
                let isFuel = reactionLookup[rBase + 2u] >= 0.0;
                if isFuel || clingRoll < material.settleStayChance {
                    return chooseFireSettleTarget(sourceCoord, res, gravityDirection, time, material);
                }
            }
        }
    }

    if isAirCoord(below, res) {
        let fallRoll = hash(sourceCoord + vec2f(fract(time * 7.3), fract(time * 11.9)));
        let prob     = 1.0 - exp(-material.fallRandomRate * uniforms.deltaTime);
        if fallRoll < prob { return below; }
    }

    let fallSeed = getMaterialStepSeed(time, material.fallRandomRate);
    let vx       = textureLoad(physicsTexture, vec2i(sourceCoord)).b;
    let vxBias   = vx / MAX_VELOCITY * 0.5;

    // On top of fire: spread aggressively to flatten pile
    if isFirePhaseCoord(below, res) {
        let fireRoll = hash(sourceCoord + vec2f(fract(time * 13.7), fract(time * 17.3)));
        let prob     = 1.0 - exp(-material.fallRandomRate * uniforms.deltaTime);
        if fireRoll >= prob { return sourceCoord; }
        let sideRoll   = clamp(hash(sourceCoord + vec2f(fallSeed * 2.17, fallSeed * 3.31)) - vxBias, 0.0, 1.0);
        let diagTarget = chooseRandomValidTarget(belowLeft, belowRight, sideRoll,
            isAirCoord(belowLeft,  res), isAirCoord(belowRight, res));
        if isValidCoord(diagTarget) { return diagTarget; }

        let flatRoll   = clamp(hash(sourceCoord + vec2f(fallSeed * 4.13, fallSeed * 5.71)) - vxBias, 0.0, 1.0);
        let flatTarget = chooseRandomValidTarget(
            sourceCoord + CELL_LEFT, sourceCoord + CELL_RIGHT, flatRoll,
            isAirCoord(sourceCoord + CELL_LEFT,  res),
            isAirCoord(sourceCoord + CELL_RIGHT, res));
        if isValidCoord(flatTarget) { return flatTarget; }

        return sourceCoord;
    }

    // Blocked by non-fire: try diagonal fall
    let diagonalRoll = hash(sourceCoord + vec2f(fallSeed, fallSeed * RANDOM_DECORRELATION));
    if diagonalRoll < material.diagonalFallChance {
        let sideRoll   = clamp(hash(sourceCoord + vec2f(fallSeed * 2.17, fallSeed * 3.31)) - vxBias, 0.0, 1.0);
        let diagTarget = chooseRandomValidTarget(belowLeft, belowRight, sideRoll,
            isAirCoord(belowLeft,  res), isAirCoord(belowRight, res));
        if isValidCoord(diagTarget) { return diagTarget; }
    }

    return chooseFireSettleTarget(sourceCoord, res, gravityDirection, time, material);
}

fn chooseFireIntentForState(
    coord:            vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    currentState:     vec4f
) -> f32 {
    let moveTarget = chooseFireTarget(
        coord, res, gravityDirection, time,
        getFireSimulation(getStateMaterialId(currentState))
    );
    return getMaterialIntentCodeForTarget(coord, moveTarget, gravityDirection);
}
