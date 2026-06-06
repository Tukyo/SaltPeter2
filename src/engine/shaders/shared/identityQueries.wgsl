// Identity texture queries. References global `identityTexture` declared in the main shader.

fn isAirCoord(coord: vec2f, res: vec2f) -> bool {
    return inBounds(coord, res) &&
           !isOccupiedState(textureLoad(identityTexture, vec2i(coord)));
}

fn isRegisteredMaterialCoord(coord: vec2f, res: vec2f) -> bool {
    return inBounds(coord, res) &&
           isRegisteredMaterialState(textureLoad(identityTexture, vec2i(coord)));
}

fn isSameMaterialCoord(coord: vec2f, res: vec2f, materialId: f32) -> bool {
    if !inBounds(coord, res) { return false; }
    let identityState = textureLoad(identityTexture, vec2i(coord));
    return isRegisteredMaterialState(identityState) && isMaterialId(getStateMaterialId(identityState), materialId);
}

fn hasOpenSurfaceAbove(coord: vec2f, res: vec2f, gravityDirection: f32) -> bool {
    let up = vec2f(0.0, gravityDirection);
    let above = coord + up;
    let aboveLeft = above + CELL_LEFT;
    let aboveRight = above + CELL_RIGHT;

    return isAirCoord(above, res) ||
           isAirCoord(aboveLeft, res) ||
           isAirCoord(aboveRight, res);
}
