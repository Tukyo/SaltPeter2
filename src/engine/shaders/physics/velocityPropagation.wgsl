fn propagateLiquidVelocity(coord: vec2f, res: vec2f) -> vec2f {
    let identityState = textureLoad(identityTexture, vec2i(coord));
    if !isOccupiedState(identityState) { return vec2f(0.0); }
    let phaseId = getMaterialPhaseId(getStateMaterialId(identityState));
    if !isMaterialPhaseId(phaseId, MATERIAL_PHASE_LIQUID) {
        let e = textureLoad(physicsTexture, vec2i(coord));
        return vec2f(e.b, e.a);
    }

    let existing = textureLoad(physicsTexture, vec2i(coord));
    var sumVx = existing.b;
    var sumVy = existing.a;
    var count = 1.0;

    let left  = coord + vec2f(-1.0, 0.0);
    let right = coord + vec2f(1.0, 0.0);
    let above = coord + vec2f(0.0, 1.0);
    let below = coord + vec2f(0.0, -1.0);
    let dirs  = array<vec2f, 4>(left, right, above, below);

    for (var i = 0u; i < 4u; i++) {
        let n = dirs[i];
        if !inBounds(n, res) { continue; }
        let nState = textureLoad(identityTexture, vec2i(n));
        if !isOccupiedState(nState) || isStaticCell(nState) { continue; }
        if !isMaterialPhaseId(getMaterialPhaseId(getStateMaterialId(nState)), MATERIAL_PHASE_LIQUID) { continue; }
        let nPhysics = textureLoad(physicsTexture, vec2i(n));
        sumVx += nPhysics.b;
        sumVy += nPhysics.a;
        count += 1.0;
    }

    let avgVx = sumVx / count;
    let avgVy = sumVy / count;
    return vec2f(
        mix(existing.b, avgVx, VELOCITY_PROPAGATION),
        mix(existing.a, avgVy, VELOCITY_PROPAGATION)
    );
}
