// Intent texture queries. References global `intentTexture` as a readable texture in the sim shader.

fn getMaterialIntentCodeAtCoord(coord: vec2f, res: vec2f) -> f32 {
    if !inBounds(coord, res) { return MATERIAL_INTENT_STAY; }
    return decodeMaterialIntent(textureLoad(intentTexture, vec2i(coord)));
}

fn getMaterialIntentTargetAtCoord(sourceCoord: vec2f, res: vec2f, gravityDirection: f32) -> vec2f {
    return getMaterialIntentTargetCoord(
        sourceCoord,
        getMaterialIntentCodeAtCoord(sourceCoord, res),
        gravityDirection
    );
}

fn materialIntentClaimsTarget(sourceCoord: vec2f, targetCoord: vec2f, res: vec2f, gravityDirection: f32) -> bool {
    if !inBounds(sourceCoord, res) { return false; }
    return sameCoord(
        getMaterialIntentTargetAtCoord(sourceCoord, res, gravityDirection),
        targetCoord
    );
}

// Finds a heavier cell directly above that expressed FALL intent into coord.
// Gate: current cell must have expressed a non-STAY escape intent (set during intent pass).
// Only valid in the simulation (resolution) pass where intentTexture is readable.
fn chooseIncomingDisplacementSource(
    coord:            vec2f,
    res:              vec2f,
    gravityDirection: f32
) -> vec2f {
    let currentIdentityState = textureLoad(identityTexture, vec2i(coord));
    if !isOccupiedState(currentIdentityState) { return INVALID_COORD; }

    let myIntent = getMaterialIntentCodeAtCoord(coord, res);
    if isMaterialId(myIntent, MATERIAL_INTENT_STAY) { return INVALID_COORD; }

    let above = coord + vec2f(0.0, gravityDirection);
    if inBounds(above, res) {
        let aboveIdentityState = textureLoad(identityTexture, vec2i(above));
        if isOccupiedState(aboveIdentityState) &&
           canDisplace(aboveIdentityState, currentIdentityState) &&
           materialIntentClaimsTarget(above, coord, res, gravityDirection) {
            return above;
        }
    }

    return INVALID_COORD;
}

// When a displacer vacates its cell (moves to intentTarget), fill the vacated cell with the
// displaced material that expressed RISE back into it — completing the density swap.
fn resolveDisplacerVacation(
    coord:                vec2f,
    intentTarget:         vec2f,
    currentIdentityState: vec4f,
    res:                  vec2f,
    gravityDirection:     f32
) -> ResolvedCell {
    // A heavier cell is already trying to move into us — take it (handles non-displacement fall chains).
    let incoming = chooseIncomingDisplacementSource(coord, res, gravityDirection);
    if isValidCoord(incoming) {
        return ResolvedCell(textureLoad(identityTexture, vec2i(incoming)), incoming);
    }

    // Our intentTarget was an occupied lighter cell. If that cell expressed RISE back to us,
    // pull its identity into our vacated position to complete the swap.
    let targetIdentityState = textureLoad(identityTexture, vec2i(intentTarget));
    if isOccupiedState(targetIdentityState) && canDisplace(currentIdentityState, targetIdentityState) {
        let displacedIntent = getMaterialIntentCodeAtCoord(intentTarget, res);
        if isMaterialId(displacedIntent, MATERIAL_INTENT_RISE) {
            let riseTarget = getMaterialIntentTargetAtCoord(intentTarget, res, gravityDirection);
            if sameCoord(riseTarget, coord) {
                return ResolvedCell(targetIdentityState, intentTarget);
            }
        }
    }

    return ResolvedCell(AIR_STATE, coord);
}
