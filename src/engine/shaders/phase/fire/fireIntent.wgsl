fn canFireMove(material: FireSimulation) -> bool {
    return material.fallRandomRate > 0.0;
}

fn isValidFireTarget(coord: vec2f, res: vec2f, gravityDirection: f32) -> bool {
    if !inBounds(coord, res) { return false; }
    if isGasPhaseCoord(coord, res) { return true; }
    if !isAirCoord(coord, res) { return false; }
    let neighbors = chebyshevOffsets();
    for (var i = 0u; i < 8u; i++) {
        let neighbor = coord + neighbors[i];
        if inBounds(neighbor, res) && isOccupiedState(textureLoad(identityTexture, vec2i(neighbor))) {
            return true;
        }
    }
    return false;
}

fn getAdjacentFuelFlammability(coord: vec2f, res: vec2f) -> f32 {
    let neighbors = chebyshevOffsets();
    var maxFlammability = 0.0;
    for (var i = 0u; i < 8u; i++) {
        let neighbor = coord + neighbors[i];
        if !inBounds(neighbor, res) { continue; }
        let neighborState = textureLoad(identityTexture, vec2i(neighbor));
        if !isOccupiedState(neighborState) { continue; }
        let flam = physicsMaterials[u32(getStateMaterialId(neighborState))].flammability;
        maxFlammability = max(maxFlammability, flam);
    }
    return maxFlammability;
}

fn chooseFireSettleTarget(
    sourceCoord:      vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    material:         FireSimulation
) -> vec2f {
    let settleSeed       = getMaterialStepSeed(time, material.settleRandomRate);
    let fuelFlammability = getAdjacentFuelFlammability(sourceCoord, res);
    let slideChance      = min(1.0, material.surfaceSlideChance  * (1.0 + fuelFlammability));
    let spreadChance     = min(1.0, material.lateralSpreadChance * (1.0 + fuelFlammability));
    let stayRoll         = hash(sourceCoord + vec2f(settleSeed, settleSeed * RANDOM_DECORRELATION));
    if stayRoll < material.settleStayChance { return sourceCoord; }

    let up  = vec2f(0.0, gravityDirection);
    let vx  = textureLoad(physicsTexture, vec2i(sourceCoord)).b;
    let vxBias = vx / MAX_VELOCITY * 0.5;

    // Surface slide: horizontal + up-slope (crawls over terrain)
    let slideRoll = hash(sourceCoord + vec2f(settleSeed * 2.17, settleSeed * 3.31));
    if slideRoll < slideChance {
        let hLeft    = sourceCoord + CELL_LEFT;
        let hRight   = sourceCoord + CELL_RIGHT;
        let hRoll    = clamp(hash(sourceCoord + vec2f(settleSeed * 4.13, settleSeed * 5.71)) - vxBias, 0.0, 1.0);
        let hTarget  = chooseRandomValidTarget(hLeft, hRight, hRoll,
                           isValidFireTarget(hLeft,  res, gravityDirection),
                           isValidFireTarget(hRight, res, gravityDirection));
        if isValidCoord(hTarget) { return hTarget; }

        let uLeft    = sourceCoord + up + CELL_LEFT;
        let uRight   = sourceCoord + up + CELL_RIGHT;
        let uRoll    = clamp(hash(sourceCoord + vec2f(settleSeed * 6.91, settleSeed * 8.23)) - vxBias, 0.0, 1.0);
        let uTarget  = chooseRandomValidTarget(uLeft, uRight, uRoll,
                           isValidFireTarget(uLeft,  res, gravityDirection),
                           isValidFireTarget(uRight, res, gravityDirection));
        if isValidCoord(uTarget) { return uTarget; }

        let uStraight = sourceCoord + up;
        if isValidFireTarget(uStraight, res, gravityDirection) { return uStraight; }
    }

    // Lateral spread: horizontal only, must be grounded
    let spreadRoll = hash(sourceCoord + vec2f(settleSeed * 9.37, settleSeed * 10.91));
    if spreadRoll > spreadChance { return sourceCoord; }

    let sLeft   = sourceCoord + CELL_LEFT;
    let sRight  = sourceCoord + CELL_RIGHT;
    let sRoll   = clamp(hash(sourceCoord + vec2f(settleSeed * 11.47, settleSeed * 12.79)) - vxBias, 0.0, 1.0);
    let sTarget = chooseRandomValidTarget(sLeft, sRight, sRoll,
                      isValidFireTarget(sLeft,  res, gravityDirection),
                      isValidFireTarget(sRight, res, gravityDirection));
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
    let clingRoll = timeHash(sourceCoord, time);
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
        let fallRoll = timeHash(sourceCoord, time);
        let prob     = 1.0 - exp(-material.fallRandomRate * uniforms.deltaTime);
        if fallRoll < prob { return below; }
    }

    let fallSeed = getMaterialStepSeed(time, material.fallRandomRate);
    let vx       = textureLoad(physicsTexture, vec2i(sourceCoord)).b;
    let vxBias   = vx / MAX_VELOCITY * 0.5;

    // On top of fire: spread aggressively to flatten pile
    if isFirePhaseCoord(below, res) {
        let fireRoll = timeHash(sourceCoord, time);
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
