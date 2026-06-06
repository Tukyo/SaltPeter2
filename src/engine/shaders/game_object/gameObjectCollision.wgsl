@group(0) @binding(0) var<storage, read_write> gameObjectStates: array<GameObjectState>;
@group(0) @binding(1) var<storage, read>       boundaryPoints:   array<GameObjectBoundaryPoint>;
@group(0) @binding(2) var<uniform>             uniforms:         GameObjectCollisionUniforms;
@group(0) @binding(3) var                      identityTexture:  texture_2d<f32>;
@group(0) @binding(4) var                      ownershipTexture: texture_2d<u32>;
@group(0) @binding(5) var<storage, read>       physicsMaterials: array<MaterialPhysicsEntry>;
@group(0) @binding(6) var                      simPhysicsTexture: texture_2d<f32>;

// Returns how many cells to push along the collision normal to correct overlap.
// fraction = hitCount / boundaryCount is raised to (1 / hardness) before scaling by force.
// hardness = 1 gives linear response; values above 1 apply a convex curve that pushes harder
// at shallow penetration depths, preventing slow phasing before overlap becomes significant.
fn depenetrationPush(hitCount: u32, boundaryCount: u32, force: f32, hardness: f32) -> f32 {
    let fraction = f32(hitCount) / max(1.0, f32(boundaryCount));
    return force * pow(fraction, 1.0 / max(0.01, hardness));
}

@compute @workgroup_size(WG_SIZE, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let gameObjectIdx = id.x;
    if (gameObjectIdx >= uniforms.gameObjectCount) { return; }

    var state = gameObjectStates[gameObjectIdx];
    if (state.isActive == 0u || state.bodyType != GAMEOBJECT_BODY_DYNAMIC) { return; }
    if (state.boundaryCount == 0u) { return; }

    // Precompute rotation matrix components from current angle — boundary points are stored in
    // local space and rotated on the fly each frame, so the collider buffer never needs updating.
    let cosTheta = cos(state.theta);
    let sinTheta = sin(state.theta);
    let simW     = i32(uniforms.simWidth);
    let simH     = i32(uniforms.simHeight);

    var normalX:             f32 = 0.0;
    var normalY:             f32 = 0.0;
    var hitCount:            u32 = 0u;
    var contactSumX:         f32 = 0.0;
    var contactSumY:         f32 = 0.0;
    var contactHits:         u32 = 0u;
    var liquidHitCount:      u32 = 0u;
    var liquidDensitySum:    f32 = 0.0;
    var liquidVelSumX:       f32 = 0.0;
    var liquidVelSumY:       f32 = 0.0;
    var materialFrictionSum: f32 = 0.0;
    var materialHardnessSum: f32 = 0.0;
    var simulationHitCount:  u32 = 0u;

    // selfEncoded = slotIndex + 1, used to skip own cells in the ownership texture
    let selfEncoded = gameObjectIdx + 1u;

    // First other-GameObject cell detected — its slot index drives the velocity response
    var detectedOtherEncoded: u32 = 0u;
    // First GO cell detected above the pivot — contributes load to accumulatedMass
    var upperGoEncoded: u32 = 0u;

    let neighbors = chebyshevOffsets();

    for (var i: u32 = 0u; i < state.boundaryCount; i++) {
        let point = boundaryPoints[state.boundaryOffset + i];

        // Rotate boundary point from local space into world space.
        // Pivot-relative coords: posX/posY is the world position of the pivot cell (center of rotation).
        let localFX = f32(point.localX) - state.pivotX;
        let localFY = f32(point.localY) - state.pivotY;
        let wx = i32(floor(state.posX + cosTheta * localFX - sinTheta * localFY));
        let wy = i32(floor(state.posY + sinTheta * localFX + cosTheta * localFY));

        // Out-of-bounds boundary cell — push inward on the crossed axis.
        // Also record a virtual contact point at the nearest in-bounds edge cell so rolling
        // friction has a valid lever arm; without this contactHits stays 0 at boundaries
        // and omega never drains.
        if (wx < 0 || wy < 0 || wx >= simW || wy >= simH) {
            if (wx < 0)    { normalX += 1.0; }
            if (wx >= simW){ normalX -= 1.0; }
            if (wy < 0)    { normalY += 1.0; }
            if (wy >= simH){ normalY -= 1.0; }
            hitCount++;
            contactSumX += f32(clamp(wx, 0, simW - 1)) + 0.5;
            contactSumY += f32(clamp(wy, 0, simH - 1)) + 0.5;
            contactHits++;
            continue;
        }

        let coord      = vec2<i32>(wx, wy);
        let cellSample = textureLoad(identityTexture,  coord, 0);
        let cellOwner  = textureLoad(ownershipTexture, coord, 0).r;
        let isOtherGo  = cellOwner != 0u && cellOwner != selfEncoded && gameObjectStates[cellOwner - 1u].boundaryCount > 0u;

        // Detect a GO resting above this boundary cell. Scans several cells upward to handle
        // the variable gap size left by depenetration (often 1-3 cells above the boundary).
        // Runs before the occupancy continue so it fires even for boundary cells adjacent to air.
        for (var lookUp: i32 = 1; lookUp <= 2 && upperGoEncoded == 0u; lookUp++) {
            let checkY = wy + lookUp;
            if (checkY < simH) {
                let aboveOwner = textureLoad(ownershipTexture, vec2<i32>(wx, checkY), 0).r;
                if (aboveOwner != 0u && aboveOwner != selfEncoded &&
                    gameObjectStates[aboveOwner - 1u].boundaryCount > 0u) {
                    upperGoEncoded = aboveOwner;
                }
            }
        }

        // Identity texture has sim cells only (GameObject cells were erased this frame).
        // Ownership texture has last-frame GameObject stamps — used to detect other GOs.
        if (!isOccupiedState(cellSample) && !isOtherGo) { continue; }

        // Phase-aware classification: gas and fire are ignored, liquid is buoyancy-only,
        // solid and other-GO cells continue to the rigid collision path.
        if (!isOtherGo) {
            let phaseId = getStatePhaseId(cellSample);
            if (isMaterialPhaseId(phaseId, MATERIAL_PHASE_GAS) ||
                isMaterialPhaseId(phaseId, MATERIAL_PHASE_FIRE)) { continue; }
            if (isMaterialPhaseId(phaseId, MATERIAL_PHASE_LIQUID)) {
                let matIdx = clamp(i32(floor(getStateMaterialId(cellSample) + 0.5)), 0, MATERIAL_COUNT - 1);
                liquidDensitySum += physicsMaterials[matIdx].density;
                let physSample = textureLoad(simPhysicsTexture, coord, 0);
                liquidVelSumX += physSample.b;
                liquidVelSumY += physSample.a;
                liquidHitCount++;
                continue;
            }
        }

        if (isOtherGo && detectedOtherEncoded == 0u) {
            detectedOtherEncoded = cellOwner;
        }

        var cellNormalX: f32 = 0.0;
        var cellNormalY: f32 = 0.0;

        for (var k: i32 = 0; k < 8; k++) {
            let offset    = neighbors[k];
            let neighborX = wx + i32(offset.x);
            let neighborY = wy + i32(offset.y);

            if (neighborX < 0 || neighborY < 0 || neighborX >= simW || neighborY >= simH) {
                continue;
            }

            let neighborCoord     = vec2<i32>(neighborX, neighborY);
            let neighborSample    = textureLoad(identityTexture,  neighborCoord, 0);
            let neighborOwner     = textureLoad(ownershipTexture, neighborCoord, 0).r;
            let neighborIsOtherGo = neighborOwner != 0u && neighborOwner != selfEncoded && gameObjectStates[neighborOwner - 1u].boundaryCount > 0u;
            let neighborIsSelf    = neighborOwner == selfEncoded;

            if (!isOccupiedState(neighborSample) && !neighborIsOtherGo && !neighborIsSelf) {
                cellNormalX += offset.x;
                cellNormalY += offset.y;
            }
        }

        if (cellNormalX == 0.0 && cellNormalY == 0.0) {
            cellNormalX = state.posX - (f32(wx) + 0.5);
            cellNormalY = state.posY - (f32(wy) + 0.5);
        }

        // Track centroid of in-bounds hits for torque lever arm calculation
        hitCount++;
        contactSumX += f32(wx) + 0.5;
        contactSumY += f32(wy) + 0.5;
        contactHits++;
        if (!isOtherGo) {
            let matIdx = clamp(i32(floor(getStateMaterialId(cellSample) + 0.5)), 0, MATERIAL_COUNT - 1);
            materialFrictionSum += physicsMaterials[matIdx].friction;
            materialHardnessSum += physicsMaterials[matIdx].hardness;
            simulationHitCount++;
        }

        if (state.velX * cellNormalX + state.velY * cellNormalY >= 0.0) { continue; }

        normalX += cellNormalX;
        normalY += cellNormalY;
    }

    let loadMass = select(0.0, gameObjectStates[upperGoEncoded - 1u].accumulatedMass, upperGoEncoded != 0u);
    state.accumulatedMass = state.mass + loadMass;

    var avgContactFriction: f32 = 1.0;
    var avgContactHardness: f32 = uniforms.depenetrationHardness;
    if (simulationHitCount > 0u) {
        avgContactFriction      = materialFrictionSum / f32(simulationHitCount);
        let sampledHardness     = materialHardnessSum / f32(simulationHitCount);
        if (sampledHardness > 0.001) { avgContactHardness = sampledHardness; }
    } else if (detectedOtherEncoded != 0u) {
        avgContactFriction = gameObjectStates[detectedOtherEncoded - 1u].friction;
    }
    let effectiveFriction = sqrt(max(0.0, state.friction) * max(0.0, avgContactFriction));

    if (liquidHitCount > 0u) {
        let submersionFraction = f32(liquidHitCount) / max(1.0, f32(state.boundaryCount));
        let avgLiquidDensity   = liquidDensitySum / f32(liquidHitCount);
        let buoyancyAccel      = (avgLiquidDensity / max(0.001, state.accumulatedMass)) * submersionFraction * uniforms.gravity * uniforms.buoyancyScale;
        state.velY += buoyancyAccel * uniforms.simStepDuration;
        let avgLiquidVelX    = (liquidVelSumX / f32(liquidHitCount)) * uniforms.liquidVelocityScale;
        let avgLiquidVelY    = (liquidVelSumY / f32(liquidHitCount)) * uniforms.liquidVelocityScale;
        let couplingStrength = submersionFraction * uniforms.liquidDrag / max(0.001, state.accumulatedMass);
        state.velX += (avgLiquidVelX - state.velX) * couplingStrength;
        state.velY += (avgLiquidVelY - state.velY) * couplingStrength;
    }

    if (hitCount == 0u) {
        state.hitCount = 0u;
        // Do not reset sleepTimer here — the settle push can briefly lift the object off the
        // surface (hitCount = 0 for one frame), which would reset the countdown and prevent
        // sleep from ever triggering. Timer only resets when speed exceeds sleepVelocityThreshold.
        // Do not clear isSleeping — waking is handled separately.
        gameObjectStates[gameObjectIdx] = state;
        return;
    }

    // While sleeping, compare current contact fraction against the baseline stored when the object
    // fell asleep. Delta is normalized to boundaryCount so sensitivity is consistent across sizes.
    // If the fraction change exceeds wakeTolerance the surface changed — wake and let the normal
    // velocity response run. A stable fraction means stay asleep and skip the response.
    if (state.isSleeping == 1u) {
        let hitDeltaFraction = f32(abs(i32(hitCount) - i32(state.hitCount))) /
                               max(1.0, f32(state.boundaryCount));
        if (hitDeltaFraction <= uniforms.wakeTolerance && liquidHitCount == 0u) {
            gameObjectStates[gameObjectIdx] = state;
            return;
        }
        // Contact fraction changed enough — wake and fall through to velocity response
        state.isSleeping = 0u;
        state.sleepTimer = 0u;
    }

    let normalLen = sqrt(normalX * normalX + normalY * normalY);
    if (normalLen < uniforms.detectionThreshold) {
        state.hitCount   = hitCount;
        state.isSleeping = 0u; // degenerate normal — don't trust the contact, stay awake
        // sleepTimer is intentionally not reset — same reasoning as hitCount == 0 path above
        gameObjectStates[gameObjectIdx] = state;
        return;
    }
    let nx = normalX / normalLen;
    let ny = normalY / normalLen;

    // Contact centroid lever arm — used for both impulse torque and rolling friction.
    let contactCentroidX = select(state.posX, contactSumX / f32(contactHits), contactHits > 0u);
    let contactCentroidY = select(state.posY, contactSumY / f32(contactHits), contactHits > 0u);
    let leverArmX = contactCentroidX - state.posX;
    let leverArmY = contactCentroidY - state.posY;

    // 2D scalar cross product of the lever arm and collision normal. Non-zero when contact is
    // off-center from the pivot — the impulse along n also produces torque.
    let rCrossN        = leverArmX * ny - leverArmY * nx;
    let rotationalTerm = (rCrossN * rCrossN) / max(0.001, state.momentOfInertia);

    // Resolve collision partner. Default = terrain: infinite mass, zero velocity.
    var otherVelX: f32 = 0.0;
    var otherVelY: f32 = 0.0;
    var otherMass: f32 = 1.0e30;

    if (detectedOtherEncoded != 0u) {
        let otherSlot  = detectedOtherEncoded - 1u;
        let otherState = gameObjectStates[otherSlot];
        if (otherState.isActive != 0u) {
            otherVelX = otherState.velX;
            otherVelY = otherState.velY;
            otherMass = max(0.001, otherState.accumulatedMass);
        }
    }

    let selfMass       = max(0.001, state.accumulatedMass);
    let e              = state.bounciness;
    let inverseMassSum = 1.0 / selfMass + 1.0 / otherMass + rotationalTerm;

    // Penetration tolerance: skip depenetration push for shallow overlaps.
    // Also skip if the push direction from the pivot leads into occupied sim cells —
    // prevents GOs from being ejected upward through material piled on top of them.
    let hitFraction       = f32(hitCount) / max(1.0, f32(state.boundaryCount));
    let pushCheckX        = i32(round(state.posX + nx));
    let pushCheckY        = i32(round(state.posY + ny));
    var pushDirectionFree = true;
    if (pushCheckX >= 0 && pushCheckY >= 0 && pushCheckX < simW && pushCheckY < simH) {
        let pushCoord     = vec2<i32>(pushCheckX, pushCheckY);
        let pushSimBlocked = isOccupiedState(textureLoad(identityTexture,  pushCoord, 0));
        let pushOwner      = textureLoad(ownershipTexture, pushCoord, 0).r;
        let pushGoBlocked  = pushOwner != 0u && pushOwner != selfEncoded;
        pushDirectionFree  = !pushSimBlocked && !pushGoBlocked;
    }
    let applyDepenetration = hitFraction > uniforms.penetrationAllowance && pushDirectionFree;

    // Relative velocity in normal direction — negative means approaching
    let relVelDotNormal = (state.velX - otherVelX) * nx + (state.velY - otherVelY) * ny;
    // Contact-point velocity includes the angular contribution at the lever arm position.
    let vRelAtContact = relVelDotNormal + state.omega * rCrossN;

    if (vRelAtContact < 0.0) {
        let relApproachSpeed = -vRelAtContact;

        let selfDotNormal = state.velX * nx + state.velY * ny;
        let selfLateralX  = state.velX - selfDotNormal * nx;
        let selfLateralY  = state.velY - selfDotNormal * ny;

        var restThreshold: f32 = 0.0;
        if (e < 1.0) {
            let eb = max(0.0, e);
            restThreshold = sqrt(2.0 * uniforms.gravity / max(0.001, 1.0 - eb * eb));
        }

        if (relApproachSpeed > restThreshold) {
            // Bounce — elastic impulse on the normal component.
            // Verification (terrain): inverseMassSum ≈ 1/selfMass → normalDeltaV = (1+e)×v_in
            //   → new normal speed = selfDotNormal + normalDeltaV = −v_in + (1+e)×v_in = e×v_in ✓
            let impulse      = (1.0 + e) * relApproachSpeed / inverseMassSum;
            let normalDeltaV = impulse / selfMass;
            if (pushDirectionFree) { state.omega += rCrossN * impulse / max(0.001, state.momentOfInertia); }
            let frictionFactor = max(0.0, 1.0 - effectiveFriction);
            state.velX = (selfDotNormal + normalDeltaV) * nx + selfLateralX * frictionFactor;
            state.velY = (selfDotNormal + normalDeltaV) * ny + selfLateralY * frictionFactor;
            if (applyDepenetration) {
                let bouncePush = depenetrationPush(hitCount, state.boundaryCount, uniforms.depenetrationForce, avgContactHardness);
                state.posX += nx * bouncePush;
                state.posY += ny * bouncePush;
            }
        } else {
            // Normal constraint impulse (e=0) to stop approach at the contact point;
            // produces torque when contact is off-center from the pivot.
            let normalRestImpulse = relApproachSpeed / inverseMassSum;
            if (pushDirectionFree) { state.omega += rCrossN * normalRestImpulse / max(0.001, state.momentOfInertia); }

            // Rest — Coulomb friction on lateral velocity relative to other surface.
            // For terrain (otherVel = 0): relLateral = selfLateral — same as before.
            let otherDotNormal  = otherVelX * nx + otherVelY * ny;
            let otherLateralX   = otherVelX - otherDotNormal * nx;
            let otherLateralY   = otherVelY - otherDotNormal * ny;
            let relLateralX     = selfLateralX - otherLateralX;
            let relLateralY     = selfLateralY - otherLateralY;
            let relLateralSpeed = sqrt(relLateralX * relLateralX + relLateralY * relLateralY);

            if (relLateralSpeed > uniforms.settleThreshold) {
                let frictionDecel   = effectiveFriction * abs(ny) * uniforms.gravity * uniforms.simStepDuration;
                let newLateralSpeed = max(0.0, relLateralSpeed - frictionDecel);
                let lateralScale    = newLateralSpeed / relLateralSpeed;
                state.velX = otherLateralX + relLateralX * lateralScale;
                state.velY = otherLateralY + relLateralY * lateralScale;
            } else {
                state.velX = otherVelX;
                state.velY = otherVelY;
            }

            // microCorrection cancels further sinking this step; depenetration push corrects accumulated overlap
            let microCorrection = relApproachSpeed * uniforms.simStepDuration;
            if (applyDepenetration) {
                let settlePush = depenetrationPush(hitCount, state.boundaryCount, uniforms.depenetrationForce, avgContactHardness);
                state.posX += nx * (microCorrection + settlePush);
                state.posY += ny * (microCorrection + settlePush);
            } else {
                state.posX += nx * microCorrection;
                state.posY += ny * microCorrection;
            }
        }

    }

    // Rolling friction: surface tangent slip couples linear velocity and omega, driving toward
    // the no-slip rolling constraint. Slip is projected onto the surface tangent (-ny, nx) so
    // this works correctly on slopes, not just flat ground. Friction limit scales with abs(ny)
    // (normal force) so steep slopes correctly reduce friction, same as the sliding path above.
    if (contactHits > 0u && pushDirectionFree) {
        let leverLen = sqrt(leverArmX * leverArmX + leverArmY * leverArmY);
        if (leverLen > uniforms.minLeverArm) {
            let contactVelTangent = (state.velX - state.omega * leverArmY) * (-ny)
                                  + (state.velY + state.omega * leverArmX) * nx;
            let rCrossT       = leverArmX * nx + leverArmY * ny;
            let invEffMass    = 1.0 / selfMass + (rCrossT * rCrossT) / max(0.001, state.momentOfInertia);
            let effectiveMass = 1.0 / max(0.0001, invEffMass);
            let frictionLimit = effectiveFriction * abs(ny) * uniforms.gravity * uniforms.simStepDuration * selfMass;
            let rollingImpulse = clamp(-contactVelTangent * effectiveMass, -frictionLimit, frictionLimit);
            state.velX  += rollingImpulse * (-ny) / selfMass;
            state.velY  += rollingImpulse * nx / selfMass;
            state.omega += rCrossT * rollingImpulse / max(0.001, state.momentOfInertia);
        }
    }

    state.hitCount = hitCount;

    let speed          = length(vec2<f32>(state.velX, state.velY));
    let isLinearSlow   = speed < uniforms.sleepVelocityThreshold;
    let isAngularSlow  = abs(state.omega) < uniforms.sleepAngularThreshold;

    if (isLinearSlow && isAngularSlow) {
        state.sleepTimer = state.sleepTimer + 1u;
        if (state.sleepTimer >= uniforms.sleepDelay) {
            state.isSleeping = 1u;
            // Sync prevPos and prevTheta so the stamp pass copies from and to the same location
            // while sleeping, preventing drift if pos/theta diverged slightly from prev values.
            state.prevPosX  = state.posX;
            state.prevPosY  = state.posY;
            state.prevTheta = state.theta;
        }
    } else {
        state.sleepTimer = 0u;
        state.isSleeping = 0u;
    }

    gameObjectStates[gameObjectIdx] = state;
}
