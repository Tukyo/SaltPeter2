// Phase-agnostic displacement helpers.
// Included in both intent and simulation passes.
// Does NOT reference intentTexture — see intentRead.wgsl for resolution-side helper.

fn getStateDensity(identityState: vec4f) -> f32 {
    if !isOccupiedState(identityState) { return 0.0; }
    let matIdx = clamp(i32(floor(getStateMaterialId(identityState) + 0.5)), 0, MATERIAL_COUNT - 1);
    return physicsMaterials[matIdx].density;
}

// fn getStateDensity(identityState: vec4f) -> f32 {
//     if !isOccupiedState(identityState) { return 0.0; }
//     let matIdx      = clamp(i32(floor(getStateMaterialId(identityState) + 0.5)), 0, MATERIAL_COUNT - 1);
//     let baseDensity = physicsMaterials[matIdx].density;
//     let noise       = (hash(vec2f(identityState.g, identityState.g * RANDOM_DECORRELATION)) * 2.0 - 1.0) * 0.05;
//     return baseDensity * (1.0 + noise);
// }

fn canDisplace(heavyIdentityState: vec4f, lightIdentityState: vec4f) -> bool {
    if isStaticCell(lightIdentityState) { return false; }
    return getStateDensity(heavyIdentityState) > getStateDensity(lightIdentityState) + 0.001;
}

// Choose an escape target for a cell being displaced.
// allowRise: true for liquids, false for powders.
// Returns coord (STAY) if no escape route exists.
fn chooseDisplacementEscapeTarget(
    coord:     vec2f,
    res:       vec2f,
    gravityDir: f32,
    allowRise:  bool
) -> vec2f {
    let up    = vec2f(0.0, gravityDir);
    let down  = vec2f(0.0, -gravityDir);
    let below = coord + down;
    let left  = coord + CELL_LEFT;
    let right = coord + CELL_RIGHT;
    let above = coord + up;

    // Natural fall takes priority — displacer fills the vacated cell behind us
    if isAirCoord(below, res) { return below; }

    // Lateral escape
    let canLeft  = isAirCoord(left,  res);
    let canRight = isAirCoord(right, res);
    if canLeft && canRight {
        return select(right, left, hash(coord + vec2f(1.3, 7.9)) > 0.5);
    }
    if canLeft  { return left; }
    if canRight { return right; }

    // Rise — liquid only: into empty space, or directly into the displacer (which will vacate)
    if allowRise {
        if isAirCoord(above, res) { return above; }
        if inBounds(above, res) {
            let aboveIdentityState = textureLoad(identityTexture, vec2i(above));
            let myIdentityState    = textureLoad(identityTexture, vec2i(coord));
            if isOccupiedState(aboveIdentityState) && canDisplace(aboveIdentityState, myIdentityState) {
                return above;
            }
        }
    }

    return coord;
}

fn hasDisplacementEscapeRoute(
    coord:     vec2f,
    res:       vec2f,
    gravityDir: f32,
    allowRise:  bool
) -> bool {
    return !sameCoord(chooseDisplacementEscapeTarget(coord, res, gravityDir, allowRise), coord);
}
