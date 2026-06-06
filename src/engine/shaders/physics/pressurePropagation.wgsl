fn computePressure(coord: vec2f, res: vec2f, gravityDir: f32) -> f32 {
    let identityState = textureLoad(identityTexture, vec2i(coord));
    if !isOccupiedState(identityState) { return 0.0; }

    let matId = decodeMaterialId(identityState);
    let matIdx = clamp(i32(floor(matId + 0.5)), 0, MATERIAL_COUNT - 1);
    let normalizedDensity = physicsMaterials[matIdx].density / MAX_DENSITY;

    let phaseId = getMaterialPhaseId(matId);
    let pressureDir = select(gravityDir, -gravityDir, isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS));

    let aboveCoord = vec2i(coord + vec2f(0.0, pressureDir));
    let leftCoord = vec2i(coord + vec2f(-1.0, 0.0));
    let rightCoord = vec2i(coord + vec2f(1.0, 0.0));

    var abovePressure = 0.0;
    var leftPressure = 0.0;
    var rightPressure = 0.0;

    if inBounds(vec2f(aboveCoord), res) {
        let crossAbove = textureLoad(crossIdentityTexture, aboveCoord);
        let ownerEncoded = textureLoad(goOwnershipTexture, aboveCoord).r;
        if isOccupiedState(crossAbove) {
            if ownerEncoded != 0u {
                // GO cell above a sim cell — use GO mass as pressure contribution.
                let mass = goStateBuffer[(ownerEncoded - 1u) * GO_STATE_STRIDE + GO_ACCUMULATED_MASS_OFFSET];
                abovePressure = min(mass * PRESSURE_STEP_SCALE, 1.0);
            } else {
                // Sim material above a GO cell — propagate sim pressure down.
                abovePressure = textureLoad(crossPhysicsTexture, aboveCoord).g;
            }
        } else {
            let selfOwner = textureLoad(goOwnershipTexture, vec2i(coord)).r;
            if ownerEncoded != 0u && ownerEncoded != selfOwner {
                // Different GO's cell above — use its mass as pressure contribution.
                let mass = goStateBuffer[(ownerEncoded - 1u) * GO_STATE_STRIDE + GO_ACCUMULATED_MASS_OFFSET];
                abovePressure = min(mass * PRESSURE_STEP_SCALE, 1.0);
            } else {
                // Same GO's own cell or empty above — propagate same-layer pressure down.
                abovePressure = textureLoad(physicsTexture, aboveCoord).g;
            }
        }
    }
    // GO cells beside block lateral pressure propagation — treat them as walls.
    if inBounds(vec2f(leftCoord), res) {
        if !isOccupiedState(textureLoad(crossIdentityTexture, leftCoord)) {
            leftPressure = textureLoad(physicsTexture, leftCoord).g;
        }
    }
    if inBounds(vec2f(rightCoord), res) {
        if !isOccupiedState(textureLoad(crossIdentityTexture, rightCoord)) {
            rightPressure = textureLoad(physicsTexture, rightCoord).g;
        }
    }

    let incoming = abovePressure * PRESSURE_VERTICAL_WEIGHT + (leftPressure + rightPressure) * PRESSURE_LATERAL_WEIGHT;
    return min(normalizedDensity * PRESSURE_STEP_SCALE + incoming, 1.0);
}
