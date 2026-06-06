// Queries against the identityTexture texture. References global `identityTexture` declared in the main shader.

fn canPowderMove(material: PowderSimulation) -> bool {
    return material.fallRandomRate > 0.0 && material.settleTryChance > 0.0;
}

fn isValidPowderSettleTarget(targetCoord: vec2f, res: vec2f, gravityDirection: f32) -> bool {
    let down = vec2f(0.0, -gravityDirection);
    let belowTarget = targetCoord + down;

    return isAirCoord(targetCoord, res) && isAirCoord(belowTarget, res);
}

fn isValidPowderSurfaceSlideTarget(targetCoord: vec2f, res: vec2f, gravityDirection: f32) -> bool {
    let down = vec2f(0.0, -gravityDirection);
    let belowTarget = targetCoord + down;

    return isAirCoord(targetCoord, res) &&
           inBounds(belowTarget, res) &&
           isOccupiedState(textureLoad(identityTexture, vec2i(belowTarget)));
}

fn getPowderCohesionAnchorCount(coord: vec2f, res: vec2f, materialId: f32) -> i32 {
    var count: i32 = 0;
    count += select(0, 1, isSameMaterialCoord(coord + CELL_LEFT, res, materialId));
    count += select(0, 1, isSameMaterialCoord(coord + CELL_RIGHT, res, materialId));
    return count;
}
