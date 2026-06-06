// Intent helpers that do not depend on intent texture access.

fn encodeMaterialIntent(intentCode: f32) -> f32 {
    return intentCode / MATERIAL_ID_SCALE;
}

fn decodeMaterialIntent(identityState: vec4f) -> f32 {
    return floor(identityState.r * MATERIAL_ID_SCALE + 0.5);
}

fn makeMaterialIntentState(intentCode: f32) -> vec4f {
    return vec4f(encodeMaterialIntent(intentCode), 0.0, 0.0, 1.0);
}

fn getMaterialIntentCodeForTarget(
    sourceCoord: vec2f,
    targetCoord: vec2f,
    gravityDirection: f32
) -> f32 {
    let delta = targetCoord - sourceCoord;
    let down = vec2f(0.0, -gravityDirection);

    if sameCoord(delta, vec2f(0.0)) { return MATERIAL_INTENT_STAY; }
    if sameCoord(delta, down) { return MATERIAL_INTENT_FALL; }
    if sameCoord(delta, down + CELL_LEFT) { return MATERIAL_INTENT_DIAGONAL_LEFT; }
    if sameCoord(delta, down + CELL_RIGHT) { return MATERIAL_INTENT_DIAGONAL_RIGHT; }
    if sameCoord(delta, CELL_LEFT) { return MATERIAL_INTENT_LATERAL_LEFT; }
    if sameCoord(delta, CELL_RIGHT) { return MATERIAL_INTENT_LATERAL_RIGHT; }
    if sameCoord(delta, -down) { return MATERIAL_INTENT_RISE; }
    if sameCoord(delta, -down + CELL_LEFT) { return MATERIAL_INTENT_DIAGONAL_RISE_LEFT; }
    if sameCoord(delta, -down + CELL_RIGHT) { return MATERIAL_INTENT_DIAGONAL_RISE_RIGHT; }

    return MATERIAL_INTENT_STAY;
}

fn getMaterialIntentTargetCoord(
    sourceCoord: vec2f,
    intentCode: f32,
    gravityDirection: f32
) -> vec2f {
    let down = vec2f(0.0, -gravityDirection);

    if isMaterialId(intentCode, MATERIAL_INTENT_FALL) { return sourceCoord + down; }
    if isMaterialId(intentCode, MATERIAL_INTENT_DIAGONAL_LEFT) { return sourceCoord + down + CELL_LEFT; }
    if isMaterialId(intentCode, MATERIAL_INTENT_DIAGONAL_RIGHT) { return sourceCoord + down + CELL_RIGHT; }
    if isMaterialId(intentCode, MATERIAL_INTENT_LATERAL_LEFT) { return sourceCoord + CELL_LEFT; }
    if isMaterialId(intentCode, MATERIAL_INTENT_LATERAL_RIGHT) { return sourceCoord + CELL_RIGHT; }
    if isMaterialId(intentCode, MATERIAL_INTENT_RISE) { return sourceCoord + (-down); }
    if isMaterialId(intentCode, MATERIAL_INTENT_DIAGONAL_RISE_LEFT) { return sourceCoord + (-down) + CELL_LEFT; }
    if isMaterialId(intentCode, MATERIAL_INTENT_DIAGONAL_RISE_RIGHT) { return sourceCoord + (-down) + CELL_RIGHT; }

    return sourceCoord;
}
