fn chooseGasIntentForState(
    coord:            vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    currentState:     vec4f
) -> f32 {
    let sim       = getGasSimulation(getStateMaterialId(currentState));
    let up        = vec2f(0.0, gravityDirection);
    let riseSeed  = getMaterialStepSeed(time, sim.riseRandomRate);
    let spreadSeed = getMaterialStepSeed(time, sim.spreadRandomRate);
    let riseRoll  = hash(coord + vec2f(riseSeed,  riseSeed  * RANDOM_DECORRELATION));
    let spreadRoll = hash(coord + vec2f(spreadSeed, spreadSeed * RANDOM_DECORRELATION));
    let turbRoll  = hash(coord + vec2f(riseSeed * RANDOM_DECORRELATION, spreadSeed));
    let dirRoll   = hash(coord + vec2f(spreadSeed * RANDOM_DECORRELATION, riseSeed * 2.0));
    let vx        = textureLoad(physicsTexture, vec2i(coord)).b;
    let velBias   = clamp(0.5 + vx / MAX_VELOCITY * 0.5, 0.0, 1.0);

    // Displacement sink: heavier gas sinks into lighter gas below
    let down  = vec2f(0.0, -gravityDirection);
    let below = coord + down;
    if inBounds(below, res) {
        let belowState = textureLoad(identityTexture, vec2i(below));
        let myState    = textureLoad(identityTexture, vec2i(coord));
        if isOccupiedState(belowState) && canDisplace(myState, belowState) && isGasPhaseCoord(below, res) {
            if hasDisplacementEscapeRoute(below, res, gravityDirection, true) {
                let belowSim  = getGasSimulation(getStateMaterialId(belowState));
                let sinkRoll  = hash(below + vec2f(fract(time * 3.7), fract(time * 5.3)));
                let sinkProb  = 1.0 - exp(-belowSim.upwardRiseChance * uniforms.deltaTime);
                if sinkRoll < sinkProb { return MATERIAL_INTENT_FALL; }
            }
        }
    }

    // Turbulence: occasionally skip straight rise and spread laterally instead
    if turbRoll < sim.turbulenceChance {
        let left  = coord + CELL_LEFT;
        let right = coord + CELL_RIGHT;
        let canLeft  = isAirCoord(left,  res);
        let canRight = isAirCoord(right, res);
        if canLeft && canRight {
            return select(MATERIAL_INTENT_LATERAL_RIGHT, MATERIAL_INTENT_LATERAL_LEFT, dirRoll > velBias);
        }
        if canLeft  { return MATERIAL_INTENT_LATERAL_LEFT; }
        if canRight { return MATERIAL_INTENT_LATERAL_RIGHT; }
    }

    // Rise straight up — only into air (gas-gas displacement is handled by phaseIntent)
    let above = coord + up;
    let myState = textureLoad(identityTexture, vec2i(coord));
    if isAirCoord(above, res) && riseRoll < sim.upwardRiseChance {
        return MATERIAL_INTENT_RISE;
    }

    // Diagonal rise
    let aboveLeft  = coord + up + CELL_LEFT;
    let aboveRight = coord + up + CELL_RIGHT;
    let canDiagLeft  = isAirCoord(aboveLeft,  res);
    let canDiagRight = isAirCoord(aboveRight, res);

    if (canDiagLeft || canDiagRight) && riseRoll < sim.diagonalRiseChance {
        if canDiagLeft && canDiagRight {
            return select(MATERIAL_INTENT_DIAGONAL_RISE_RIGHT, MATERIAL_INTENT_DIAGONAL_RISE_LEFT, dirRoll > velBias);
        }
        if canDiagLeft  { return MATERIAL_INTENT_DIAGONAL_RISE_LEFT; }
        return MATERIAL_INTENT_DIAGONAL_RISE_RIGHT;
    }

    // Lateral spread
    let left  = coord + CELL_LEFT;
    let right = coord + CELL_RIGHT;
    let canLeft  = isAirCoord(left,  res);
    let canRight = isAirCoord(right, res);

    if (canLeft || canRight) && spreadRoll < sim.lateralSpreadChance {
        if canLeft && canRight {
            return select(MATERIAL_INTENT_LATERAL_RIGHT, MATERIAL_INTENT_LATERAL_LEFT, dirRoll > velBias);
        }
        if canLeft  { return MATERIAL_INTENT_LATERAL_LEFT; }
        return MATERIAL_INTENT_LATERAL_RIGHT;
    }

    return MATERIAL_INTENT_STAY;
}
