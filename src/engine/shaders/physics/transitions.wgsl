// Returns the target material ID if a phase transition should fire, or -1.0 if none.
// Checked at the end of each sim step against the resolved (post-movement) identityState.
fn getTransitionTargetId(identityState: vec4f, temperature: f32) -> f32 {
    if !isOccupiedState(identityState) { return -1.0; }

    let matIdx = clamp(i32(floor(decodeMaterialId(identityState) + 0.5)), 0, MATERIAL_COUNT - 1);
    let mat    = physicsMaterials[matIdx];

    // Heat transitions
    if mat.meltToId    > 0.5 && temperature >= mat.meltTemp    { return mat.meltToId; }
    if mat.boilToId    > 0.5 && temperature >= mat.boilTemp    { return mat.boilToId; }

    // Cool transitions
    if mat.freezeToId  > 0.5 && temperature <= mat.freezeTemp  { return mat.freezeToId; }
    if mat.condenseToId > 0.5 && temperature <= mat.condenseTemp { return mat.condenseToId; }

    return -1.0;
}
