fn propagateVelocity(coord: vec2f, res: vec2f) -> vec2f {
    let identityState = textureLoad(identityTexture, vec2i(coord));
    if !isOccupiedState(identityState) { return vec2f(0.0); }
    let phaseId  = getMaterialPhaseId(getStateMaterialId(identityState));
    let isLiquid = isMaterialPhaseId(phaseId, MATERIAL_PHASE_LIQUID);
    let isPowder = isMaterialPhaseId(phaseId, MATERIAL_PHASE_POWDER);
    let isSolid  = isMaterialPhaseId(phaseId, MATERIAL_PHASE_SOLID);

    let existing = textureLoad(physicsTexture, vec2i(coord));
    if !isLiquid && !isPowder && !isSolid { return vec2f(existing.b, existing.a); }

    var propagation = 0.0;
    switch i32(phaseId) {
        case 0: { propagation = VELOCITY_PROPAGATION_SOLID; }
        case 1: { propagation = VELOCITY_PROPAGATION_POWDER; }
        case 2: { propagation = VELOCITY_PROPAGATION_LIQUID; }
        default: {}
    }

    let left  = coord + vec2f(-1.0, 0.0);
    let right = coord + vec2f( 1.0, 0.0);
    let above = coord + vec2f( 0.0, 1.0);
    let below = coord + vec2f( 0.0,-1.0);
    let dirs  = array<vec2f, 4>(left, right, above, below);

    var influenceVx = 0.0;
    var influenceVy = 0.0;
    var totalWeight = 0.0;

    for (var i = 0u; i < 4u; i++) {
        let n = dirs[i];
        if !inBounds(n, res) { continue; }
        let nState = textureLoad(identityTexture, vec2i(n));
        if !isOccupiedState(nState) || isStaticCell(nState) { continue; }
        let nPhaseId = getMaterialPhaseId(getStateMaterialId(nState));
        if isLiquid && !isMaterialPhaseId(nPhaseId, MATERIAL_PHASE_LIQUID) { continue; }
        if isPowder && !isMaterialPhaseId(nPhaseId, MATERIAL_PHASE_POWDER) { continue; }
        if isSolid  && !isMaterialPhaseId(nPhaseId, MATERIAL_PHASE_SOLID)  { continue; }
        let nPhysics = textureLoad(physicsTexture, vec2i(n));
        let nVx      = nPhysics.b;
        let nVy      = nPhysics.a;
        let toMe     = coord - n;
        let dot      = nVx * toMe.x + nVy * toMe.y;
        if dot <= 0.0 { continue; }
        influenceVx += nVx * dot;
        influenceVy += nVy * dot;
        totalWeight += dot;
    }

    if totalWeight <= 0.0 { return vec2f(existing.b, existing.a); }
    influenceVx /= totalWeight;
    influenceVy /= totalWeight;
    return vec2f(
        mix(existing.b, influenceVx, propagation),
        mix(existing.a, influenceVy, propagation)
    );
}
