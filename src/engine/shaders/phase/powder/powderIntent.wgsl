fn choosePowderIntentForState(
    sourceCoord: vec2f,
    res: vec2f,
    gravityDirection: f32,
    time: f32,
    sourceState: vec4f
) -> f32 {
    let targetCoord = choosePowderTargetForState(sourceCoord, res, gravityDirection, time, sourceState);
    return getMaterialIntentCodeForTarget(sourceCoord, targetCoord, gravityDirection);
}
