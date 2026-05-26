// Depends on: common.wgsl, identity.wgsl
// Bindings: identityTexture (binding 0), reactionLookup (binding 11), materialStates (binding 10)

struct ReactionResult {
    state:     vec4f,
    cellState: vec4f,
}

const NO_REACTION: ReactionResult = ReactionResult(vec4f(0.0, 0.0, 0.0, -1.0), vec4f(0.0));

fn checkReactions(coord: vec2f, res: vec2f, myState: vec4f, time: f32) -> ReactionResult {
    if !isOccupiedState(myState) { return NO_REACTION; }

    let myId  = getStateMaterialId(myState);
    let seed  = hash(coord + fract(vec2f(time * 0.1337, time * 0.2719)));

    let offsets = chebyshevOffsets();

    for (var i = 0u; i < 8u; i++) {
        let neighborCoord = coord + offsets[i];
        if !inBounds(neighborCoord, res) { continue; }

        let neighborState = textureLoad(identityTexture, vec2i(neighborCoord));
        let neighborId = select(0.0, getStateMaterialId(neighborState), isOccupiedState(neighborState));
        let base       = getReactionBase(myId, neighborId);
        let mask       = u32(reactionLookup[base + 4u]);
        if mask != 0u && (mask & (1u << i)) == 0u { continue; }
        let chance     = reactionLookup[base + 2u];

        if chance < 0.0 { continue; }

        var probability: f32;
        // If the phase is fire, prefer branching outward before reacting inward
        if isMaterialPhaseId(getMaterialPhaseId(neighborId), MATERIAL_PHASE_FIRE) {
            var airCount = 0u;
            let chebyshev = chebyshevOffsets();
            for (var i = 0u; i < 8u; i++) {
                let cn = coord + chebyshev[i];
                if !inBounds(cn, res) || !isOccupiedState(textureLoad(identityTexture, vec2i(cn))) {
                    airCount++;
                }
            }
            let surfaceScale = 0.1 + f32(airCount) * 0.1125;
            probability = 1.0 - exp(-chance * surfaceScale * uniforms.deltaTime);
        } else { // If not fire, do the normal logic, just react
            probability = 1.0 - exp(-chance * uniforms.deltaTime);
        }

        if seed > probability { continue; }

        let productIdA = reactionLookup[base + 0u];

        if productIdA < 0.5 { return ReactionResult(AIR_STATE, vec4f(0.0)); }

        let newState      = makeStateWithSeed(productIdA, hash(coord + vec2f(time, 0.0)));
        let myBase        = getMaterialStateBase(myId);
        let myHealth      = materialStates[myBase].health;
        let newBase       = getMaterialStateBase(productIdA);
        let newLifetime   = materialStates[newBase].lifetime;
        let lifetimeRatio = select(0.0, myHealth / newLifetime, newLifetime > 0.0);
        let newCellState  = vec4f(1.0, lifetimeRatio, 0.0, 0.0);

        let biproductId = reactionLookup[base + 3u];
        if biproductId >= 0.5 {
            let emitOffsets = chebyshevOffsets();
            for (var j = 0u; j < 8u; j++) {
                let emitCoord = coord + emitOffsets[j];
                if !inBounds(emitCoord, res) { continue; }
                if isOccupiedState(textureLoad(identityTexture, vec2i(emitCoord))) { continue; }
                let biproductState    = makeStateWithSeed(biproductId, hash(emitCoord + vec2f(time, 0.0)));
                let bpBase            = getMaterialStateBase(biproductId);
                let bpLifetime        = materialStates[bpBase].lifetime;
                let bpCellState       = vec4f(1.0, select(0.0, 1.0, bpLifetime > 0.0), 0.0, 0.0);
                textureStore(nextIdentityTexture, vec2i(emitCoord), biproductState);
                textureStore(nextCellStateTexture, vec2i(emitCoord), bpCellState);
                break;
            }
        }

        return ReactionResult(newState, newCellState);
    }

    return NO_REACTION;
}
