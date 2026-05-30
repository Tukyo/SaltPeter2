fn chooseLiquidIntentForState(
    coord:            vec2f,
    res:              vec2f,
    gravityDirection: f32,
    time:             f32,
    currentState:     vec4f
) -> f32 {
    let sim       = getLiquidSimulation(getStateMaterialId(currentState));
    let down      = vec2f(0.0, -gravityDirection);
    let fallSeed  = getMaterialStepSeed(time, sim.fallRandomRate);
    let flowSeed  = getMaterialStepSeed(time, sim.flowRandomRate);
    let fallRoll  = hash(coord + vec2f(fallSeed, fallSeed * RANDOM_DECORRELATION));
    let flowRoll  = hash(coord + vec2f(flowSeed, flowSeed * RANDOM_DECORRELATION));
    let dirRoll   = hash(coord + vec2f(flowSeed * RANDOM_DECORRELATION, fallSeed));
    let viscRoll  = hash(coord + vec2f(fallSeed * RANDOM_DECORRELATION, flowSeed * 2.0));

    let vx       = textureLoad(physicsTexture, vec2i(coord)).b;
    let velBias  = clamp(0.5 + vx / MAX_VELOCITY * 0.5, 0.0, 1.0);

    let neighbors = chebyshevOffsets();

    // Velocity impulse: react to high-velocity neighbors, pushed outward from the source
    let myDensity = getStateDensity(currentState);
    var pushX = 0.0;
    var pushY = 0.0;
    for (var i = 0u; i < 8u; i++) {
        let n = coord + neighbors[i];
        if !inBounds(n, res) { continue; }
        let nPhysics = textureLoad(physicsTexture, vec2i(n));
        let nVx      = nPhysics.b;
        let nVy      = nPhysics.a;
        let toMe     = coord - n;
        let dot      = nVx * toMe.x + nVy * toMe.y;
        if dot <= 0.0 { continue; }
        let nState   = textureLoad(identityTexture, vec2i(n));
        let nDensity = select(myDensity, getStateDensity(nState), isOccupiedState(nState));
        let speed    = length(vec2f(nVx, nVy));
        pushX += toMe.x * speed * (nDensity / myDensity);
        pushY += toMe.y * speed * (nDensity / myDensity);
    }
    let pushMag = length(vec2f(pushX, pushY));
    if pushMag > VELOCITY_ACCELERATION {
        let splashRoll = timeHash(coord, time);
        if splashRoll < clamp(pushMag / MAX_VELOCITY * sim.turbulenceStrength, 0.0, 0.95) {
            let pushTarget = coord + round(normalize(vec2f(pushX, pushY)));
            if inBounds(pushTarget, res) && isAirCoord(pushTarget, res) {
                return getMaterialIntentCodeForTarget(coord, pushTarget, gravityDirection);
            }
        }
    }
    var liquidNeighborCount: i32 = 0;
    for (var i = 0u; i < 8u; i++) {
        let n = coord + neighbors[i];
        if !inBounds(n, res) { continue; }
        let nState = textureLoad(identityTexture, vec2i(n));
        if !isOccupiedState(nState) { continue; }
        if isMaterialPhaseId(getMaterialPhaseId(getStateMaterialId(nState)), MATERIAL_PHASE_LIQUID) {
            liquidNeighborCount++;
        }
    }
    let weaklyBonded = liquidNeighborCount <= i32(sim.surfaceTension * 8.0);

    // Fall straight down — weakly bonded cells splash into any available air neighbor
    let below = coord + down;
    if isAirCoord(below, res) {
        if weaklyBonded {
            let splashRoll = hash(coord + vec2f(fallSeed * 7.13, flowSeed * 4.91));
            if splashRoll < sim.turbulenceChance {
                var airOffsets: array<vec2f, 8>;
                var airCount: i32 = 0;
                for (var i = 0u; i < 8u; i++) {
                    if isAirCoord(coord + neighbors[i], res) {
                        airOffsets[airCount] = neighbors[i];
                        airCount++;
                    }
                }
                if airCount > 0 {
                    let pick = i32(hash(coord + vec2f(flowSeed * 9.17, fallSeed * 6.43)) * f32(airCount)) % airCount;
                    return getMaterialIntentCodeForTarget(coord, coord + airOffsets[pick], gravityDirection);
                }
            }
        }
        return MATERIAL_INTENT_FALL;
    }

    // Diagonal down
    let belowLeft   = coord + down + CELL_LEFT;
    let belowRight  = coord + down + CELL_RIGHT;
    let canDiagLeft  = isAirCoord(belowLeft,  res);
    let canDiagRight = isAirCoord(belowRight, res);

    if (canDiagLeft || canDiagRight) && (weaklyBonded || flowRoll < sim.diagonalFlowChance) {
        if canDiagLeft && canDiagRight {
            return select(MATERIAL_INTENT_DIAGONAL_RIGHT, MATERIAL_INTENT_DIAGONAL_LEFT, dirRoll > velBias);
        }
        if canDiagLeft  { return MATERIAL_INTENT_DIAGONAL_LEFT; }
        return MATERIAL_INTENT_DIAGONAL_RIGHT;
    }

    // Viscosity gate for lateral flow — bypassed when pressure pushes the cell
    let pressure = textureLoad(physicsTexture, vec2i(coord)).g;
    if viscRoll < sim.viscosityResistanceChance && pressure <= 0.0 { return MATERIAL_INTENT_STAY; }

    // Lateral flow
    let left  = coord + CELL_LEFT;
    let right = coord + CELL_RIGHT;
    let canLeft  = isAirCoord(left,  res);
    let canRight = isAirCoord(right, res);

    if (canLeft || canRight) && (weaklyBonded || flowRoll < sim.lateralFlowChance) {
        if canLeft && canRight {
            return select(MATERIAL_INTENT_LATERAL_RIGHT, MATERIAL_INTENT_LATERAL_LEFT, dirRoll > velBias);
        }
        if canLeft  { return MATERIAL_INTENT_LATERAL_LEFT; }
        return MATERIAL_INTENT_LATERAL_RIGHT;
    }

    // Displacement fall: sink into a lighter occupied cell if it has an escape route
    if inBounds(below, res) {
        let belowState = textureLoad(identityTexture, vec2i(below));
        let myState    = textureLoad(identityTexture, vec2i(coord));
        if isOccupiedState(belowState) && canDisplace(myState, belowState) {
            let belowPhaseId = getMaterialPhaseId(getStateMaterialId(belowState));
            let allowRise    = isMaterialPhaseId(belowPhaseId, MATERIAL_PHASE_LIQUID);
            if hasDisplacementEscapeRoute(below, res, gravityDirection, allowRise) {
                var canSink = true;
                if allowRise {
                    let liquidSim = getLiquidSimulation(getStateMaterialId(belowState));
                    let roll      = displacementHash(coord, time);
                    canSink = roll >= liquidSim.thickness;
                }
                if canSink { return MATERIAL_INTENT_FALL; }
            }
        }
    }

    // Diagonal rise — slosh upward into air when blocked and under pressure
    let up           = vec2f(0.0, gravityDirection);
    let aboveLeft    = coord + up + CELL_LEFT;
    let aboveRight   = coord + up + CELL_RIGHT;
    let canRiseLeft  = isAirCoord(aboveLeft,  res);
    let canRiseRight = isAirCoord(aboveRight, res);

    if (canRiseLeft || canRiseRight || weaklyBonded) {
        let sloshRoll = hash(coord + vec2f(flowSeed * 3.17, fallSeed * 5.83));
        if sloshRoll < sim.turbulenceChance {
            if canRiseLeft && canRiseRight {
                return select(MATERIAL_INTENT_DIAGONAL_RISE_RIGHT, MATERIAL_INTENT_DIAGONAL_RISE_LEFT, dirRoll > velBias);
            }
            if canRiseLeft  { return MATERIAL_INTENT_DIAGONAL_RISE_LEFT; }
            if canRiseRight { return MATERIAL_INTENT_DIAGONAL_RISE_RIGHT; }
        }
    }

    // Pressure-driven displacement escape — propagates outward from displacement site each physics tick
    if displacementHash(coord, time) < pressure * sim.dispersion {
        let escapeTarget = chooseDisplacementEscapeTarget(coord, res, gravityDirection, true);
        if !sameCoord(escapeTarget, coord) {
            return getMaterialIntentCodeForTarget(coord, escapeTarget, gravityDirection);
        }
    }

    return MATERIAL_INTENT_STAY;
}
