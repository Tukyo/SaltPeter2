// Depends on: common.wgsl, identity.wgsl
// Bindings: identityTexture, goIdentityTexture, reactionLookup, materialStates

struct ReactionResult {
    state:     vec4f,
    cellState: vec4f,
}

const NO_REACTION: ReactionResult = ReactionResult(vec4f(0.0, 0.0, 0.0, -1.0), vec4f(0.0));

// Prefers the sim neighbor; falls back to the GO layer when the sim cell is air.
fn sampleNeighborState(nc: vec2f, res: vec2f) -> vec4f {
    let simState = textureLoad(identityTexture, vec2i(nc));
    if isOccupiedState(simState) { return simState; }
    return textureLoad(goIdentityTexture, vec2i(nc), 0);
}

fn checkReactions(coord: vec2f, res: vec2f, myState: vec4f, time: f32) -> ReactionResult {
    if !isOccupiedState(myState) { return NO_REACTION; }

    let myId            = getStateMaterialId(myState);
    let seed            = hash(coord + fract(vec2f(time * 0.1337, time * 0.2719)));
    let chebyshev = chebyshevOffsets();
    let cardinal  = cardinalOffsets();

    // Count reactive neighbors for each path to scale probability down when isolated.
    var chebyshevReactiveCount:   f32 = 0.0;
    var cardinalReactiveCount: f32 = 0.0;
    for (var k = 0u; k < 8u; k++) {
        let nc  = coord + chebyshev[k];
        if !inBounds(nc, res) { continue; }
        let ns  = sampleNeighborState(nc, res);
        let nid = select(0.0, getStateMaterialId(ns), isOccupiedState(ns));
        if reactionLookup[getReactionBase(myId, nid) + 2u] >= 0.0 {
            chebyshevReactiveCount += 1.0;
            if k < 4u { cardinalReactiveCount += 1.0; }
        }
    }
    let chebyshevScale   = max(chebyshevReactiveCount,   1.0) / 8.0;
    let cardinalScale = max(cardinalReactiveCount, 1.0) / 4.0;

    for (var loopIndex = 0u; loopIndex < 2u; loopIndex++) {
        let useChebyshev     = loopIndex == 0u;
        let offsetCount = select(4u, 8u, useChebyshev);
        let scale       = select(cardinalScale, chebyshevScale, useChebyshev);

        for (var i = 0u; i < offsetCount; i++) {
            let neighborCoord = coord + select(cardinal[i], chebyshev[i], useChebyshev);
            if !inBounds(neighborCoord, res) { continue; }

            let neighborState = sampleNeighborState(neighborCoord, res);
            let neighborId    = select(0.0, getStateMaterialId(neighborState), isOccupiedState(neighborState));
            let neighborPhase = getMaterialPhaseId(neighborId);

            // Chebyshev path handles fire neighbors; cardinal path handles everything else.
            let isChebyshevNeighbor = isMaterialPhaseId(neighborPhase, MATERIAL_PHASE_FIRE);
            if useChebyshev != isChebyshevNeighbor { continue; }

            // For diagonal fire spread, require at least one cardinal bridge cell to be open.
            // Prevents fire from cutting corners through solid fuel.
            if useChebyshev && i >= 4u {
                let offset    = chebyshev[i];
                let bridge1   = coord + vec2f(offset.x, 0.0);
                let bridge2   = coord + vec2f(0.0, offset.y);
                let blocked1  = inBounds(bridge1, res) && isOccupiedState(sampleNeighborState(bridge1, res));
                let blocked2  = inBounds(bridge2, res) && isOccupiedState(sampleNeighborState(bridge2, res));
                if blocked1 && blocked2 { continue; }
            }

            let base   = getReactionBase(myId, neighborId);
            let mask   = u32(reactionLookup[base + 4u]);
            if mask != 0u && (mask & (1u << i)) == 0u { continue; }
            let chance = reactionLookup[base + 2u];
            if chance < 0.0 { continue; }

            let productIdA = reactionLookup[base + 0u];

            var probability: f32;
            if isChebyshevNeighbor {
                let isFuelReaction = abs(productIdA - myId) > 0.5;
                if isFuelReaction {
                    var fuelAirCount = 0u;
                    var fireAirCount = 0u;
                    for (var j = 0u; j < 4u; j++) {
                        let fuelNeighbor = coord + cardinal[j];
                        if !inBounds(fuelNeighbor, res) || !isOccupiedState(sampleNeighborState(fuelNeighbor, res)) {
                            fuelAirCount++;
                        }
                        let fireNeighbor = neighborCoord + cardinal[j];
                        if !inBounds(fireNeighbor, res) || !isOccupiedState(sampleNeighborState(fireNeighbor, res)) {
                            fireAirCount++;
                        }
                    }
                    let myDurability = physicsMaterials[u32(myId)].durability;
                    let surfaceScale = f32(min(fuelAirCount, fireAirCount)) / 4.0;
                    probability = 1.0 - exp(-chance / myDurability * surfaceScale * uniforms.deltaTime);
                } else {
                    probability = 1.0 - exp(-chance * uniforms.deltaTime);
                }
            } else {
                probability = 1.0 - exp(-chance * scale * uniforms.deltaTime);
            }

            if seed > probability { continue; }

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
                for (var j = 0u; j < 8u; j++) {
                    let emitCoord = coord + chebyshev[j];
                    if !inBounds(emitCoord, res) { continue; }
                    if isOccupiedState(sampleNeighborState(emitCoord, res)) { continue; }
                    let biproductState = makeStateWithSeed(biproductId, hash(emitCoord + vec2f(time, 0.0)));
                    let bpBase         = getMaterialStateBase(biproductId);
                    let bpLifetime     = materialStates[bpBase].lifetime;
                    let bpCellState    = vec4f(1.0, select(0.0, 1.0, bpLifetime > 0.0), 0.0, 0.0);
                    textureStore(nextIdentityTexture, vec2i(emitCoord), biproductState);
                    textureStore(nextCellStateTexture, vec2i(emitCoord), bpCellState);
                    break;
                }
            }

            return ReactionResult(newState, newCellState);
        }
    }

    return NO_REACTION;
}
