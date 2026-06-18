fn chooseGasIntentForState(
    coord: vec2f,
    res: vec2f,
    gravityDirection: f32,
    time: f32,
    currentState: vec4f
) -> f32 {
    let sim = getGasSimulation(getStateMaterialId(currentState));
    let up = vec2f(0.0, gravityDirection);
    let riseSeed = getMaterialStepSeed(time, sim.riseRandomRate);
    let spreadSeed = getMaterialStepSeed(time, sim.spreadRandomRate);
    let riseRoll = timeHash(coord, time);
    let riseProb = 1.0 - exp(-sim.upwardRiseChance * sim.riseRandomRate * uniforms.deltaTime);
    let diagRiseProb = 1.0 - exp(-sim.diagonalRiseChance * sim.riseRandomRate * uniforms.deltaTime);
    let spreadRoll = timeHash(coord + vec2f(RANDOM_DECORRELATION, 0.0), time);
    let spreadProb = 1.0 - exp(-sim.lateralSpreadChance * sim.spreadRandomRate * uniforms.deltaTime);
    let turbRoll = hash(coord + vec2f(riseSeed * RANDOM_DECORRELATION, spreadSeed));
    let dirRoll = hash(coord + vec2f(spreadSeed * RANDOM_DECORRELATION, riseSeed * 2.0));
    let vx = textureLoad(physicsTexture, vec2i(coord)).b;
    let velBias = clamp(0.5 + vx / MAX_VELOCITY * 0.5, 0.0, 1.0);
    let noiseCoord = coord / NOISE_SCALE + vec2f(time * NOISE_SCROLL_SPEED, time * NOISE_SCROLL_SPEED * 0.61803);
    let noiseVal = fbm(noiseCoord, NOISE_TYPE, NOISE_OCTAVES, NOISE_PERSISTENCE, time * NOISE_SCROLL_SPEED).x;
    let noiseBias = clamp(noiseVal * NOISE_STRENGTH + (dirRoll - 0.5) * (1.0 - NOISE_STRENGTH) + 0.5, 0.0, 1.0);

    // Displacement sink: heavier gas sinks into lighter gas below
    let down = vec2f(0.0, -gravityDirection);
    let below = coord + down;
    if inBounds(below, res) {
        let belowState = textureLoad(identityTexture, vec2i(below));
        let myState = textureLoad(identityTexture, vec2i(coord));
        if isOccupiedState(belowState) && canDisplace(myState, belowState) && isGasPhaseCoord(below, res) {
            if hasDisplacementEscapeRoute(below, res, gravityDirection, true) {
                let belowSim = getGasSimulation(getStateMaterialId(belowState));
                let sinkRoll = displacementHash(below, time);
                let sinkProb = 1.0 - exp(-belowSim.upwardRiseChance * uniforms.deltaTime);
                if sinkRoll < sinkProb { return MATERIAL_INTENT_FALL; }
            }
        }
    }

    // Turbulence: occasionally skip straight rise and spread laterally instead
    if turbRoll < sim.turbulenceChance {
        let left = coord + CELL_LEFT;
        let right = coord + CELL_RIGHT;
        let canLeft = isAirCoord(left, res);
        let canRight = isAirCoord(right, res);
        if canLeft && canRight {
            return select(MATERIAL_INTENT_LATERAL_RIGHT, MATERIAL_INTENT_LATERAL_LEFT, noiseBias > velBias);
        }
        if canLeft { return MATERIAL_INTENT_LATERAL_LEFT; }
        if canRight { return MATERIAL_INTENT_LATERAL_RIGHT; }
    }

    // Rise straight up — only into air or fire (gas-gas displacement is handled by phaseIntent)
    let above = coord + up;
    let myState = textureLoad(identityTexture, vec2i(coord));
    if (isAirCoord(above, res) || isFirePhaseCoord(above, res)) && riseRoll < riseProb {
        return MATERIAL_INTENT_RISE;
    }

    // Diagonal rise
    let aboveLeft = coord + up + CELL_LEFT;
    let aboveRight = coord + up + CELL_RIGHT;
    let canDiagLeft = isAirCoord(aboveLeft, res) || isFirePhaseCoord(aboveLeft, res);
    let canDiagRight = isAirCoord(aboveRight, res) || isFirePhaseCoord(aboveRight, res);

    if (canDiagLeft || canDiagRight) && riseRoll < diagRiseProb {
        if canDiagLeft && canDiagRight {
            return select(MATERIAL_INTENT_DIAGONAL_RISE_RIGHT, MATERIAL_INTENT_DIAGONAL_RISE_LEFT, noiseBias > velBias);
        }
        if canDiagLeft { return MATERIAL_INTENT_DIAGONAL_RISE_LEFT; }
        return MATERIAL_INTENT_DIAGONAL_RISE_RIGHT;
    }

    // Lateral spread
    let left = coord + CELL_LEFT;
    let right = coord + CELL_RIGHT;
    let canLeft = isAirCoord(left, res);
    let canRight = isAirCoord(right, res);

    if (canLeft || canRight) && spreadRoll < spreadProb {
        if canLeft && canRight {
            return select(MATERIAL_INTENT_LATERAL_RIGHT, MATERIAL_INTENT_LATERAL_LEFT, noiseBias > velBias);
        }
        if canLeft { return MATERIAL_INTENT_LATERAL_LEFT; }
        return MATERIAL_INTENT_LATERAL_RIGHT;
    }

    return MATERIAL_INTENT_STAY;
}
