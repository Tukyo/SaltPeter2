fn computePressure(coord: vec2f, res: vec2f, gravityDir: f32) -> f32 {
    let identityState = textureLoad(identityTexture, vec2i(coord));
    if !isOccupiedState(identityState) { return 0.0; }

    let matId  = decodeMaterialId(identityState);
    let matIdx = clamp(i32(floor(matId + 0.5)), 0, MATERIAL_COUNT - 1);
    let normalizedDensity = physicsMaterials[matIdx].density / MAX_DENSITY;

    let phaseId     = getMaterialPhaseId(matId);
    let pressureDir = select(gravityDir, -gravityDir, isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS));

    let aboveCoord = vec2i(coord + vec2f(0.0, pressureDir));
    let leftCoord  = vec2i(coord + vec2f(-1.0, 0.0));
    let rightCoord = vec2i(coord + vec2f(1.0, 0.0));

    var abovePressure = 0.0;
    var leftPressure  = 0.0;
    var rightPressure = 0.0;

    if inBounds(vec2f(aboveCoord), res) { abovePressure = textureLoad(physicsTexture, aboveCoord).g; }
    if inBounds(vec2f(leftCoord),  res) { leftPressure  = textureLoad(physicsTexture, leftCoord).g; }
    if inBounds(vec2f(rightCoord), res) { rightPressure = textureLoad(physicsTexture, rightCoord).g; }

    let incoming = abovePressure * PRESSURE_VERTICAL_WEIGHT + (leftPressure + rightPressure) * PRESSURE_LATERAL_WEIGHT;
    return min(normalizedDensity * PRESSURE_STEP_SCALE + incoming, 1.0);
}
