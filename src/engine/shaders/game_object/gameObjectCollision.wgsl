@group(0) @binding(0) var<storage, read_write> gameObjectStates: array<GameObjectState>;
@group(0) @binding(1) var<storage, read>       boundaryPoints:   array<GameObjectBoundaryPoint>;
@group(0) @binding(2) var<uniform>             uniforms:         GameObjectCollisionUniforms;
@group(0) @binding(3) var                      identityTexture:  texture_2d<f32>;
@group(0) @binding(4) var                      ownershipTexture: texture_2d<u32>;

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

    var normalX:     f32 = 0.0;
    var normalY:     f32 = 0.0;
    var hitCount:    u32 = 0u;
    var contactSumX: f32 = 0.0; // sum of in-bounds hit cell centers, for torque lever arm
    var contactSumY: f32 = 0.0;
    var contactHits: u32 = 0u;

    // selfEncoded = slotIndex + 1, used to skip own cells in the ownership texture
    let selfEncoded = gameObjectIdx + 1u;

    // First other-GO cell detected — its slot index drives the velocity response
    var detectedOtherEncoded: u32 = 0u;

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
        let isOtherGo  = cellOwner != 0u && cellOwner != selfEncoded;

        // Identity texture has sim cells only (GO cells were erased this frame).
        // Ownership texture has last-frame GO stamps — used to detect other GOs.
        if (!isOccupiedState(cellSample) && !isOtherGo) { continue; }

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
            let neighborIsOtherGo = neighborOwner != 0u && neighborOwner != selfEncoded;
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

        if (state.velX * cellNormalX + state.velY * cellNormalY >= 0.0) { continue; }

        normalX += cellNormalX;
        normalY += cellNormalY;
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
        if (hitDeltaFraction <= uniforms.wakeTolerance) {
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
            otherMass = max(0.001, otherState.mass);
        }
    }

    let selfMass       = max(0.001, state.mass);
    let e              = state.bounciness;
    let inverseMassSum = 1.0 / selfMass + 1.0 / otherMass;

    // Relative velocity in normal direction — negative means approaching
    let relVelDotNormal = (state.velX - otherVelX) * nx + (state.velY - otherVelY) * ny;

    if (relVelDotNormal < 0.0) {
        let relApproachSpeed = -relVelDotNormal;

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
            let frictionFactor = max(0.0, 1.0 - state.friction);
            state.velX = (selfDotNormal + normalDeltaV) * nx + selfLateralX * frictionFactor;
            state.velY = (selfDotNormal + normalDeltaV) * ny + selfLateralY * frictionFactor;
            let bouncePush = depenetrationPush(hitCount, state.boundaryCount, uniforms.depenetrationForce, uniforms.depenetrationHardness);
            state.posX += nx * bouncePush;
            state.posY += ny * bouncePush;
        } else {
            // Rest — Coulomb friction on lateral velocity relative to other surface.
            // For terrain (otherVel = 0): relLateral = selfLateral — same as before.
            let otherDotNormal  = otherVelX * nx + otherVelY * ny;
            let otherLateralX   = otherVelX - otherDotNormal * nx;
            let otherLateralY   = otherVelY - otherDotNormal * ny;
            let relLateralX     = selfLateralX - otherLateralX;
            let relLateralY     = selfLateralY - otherLateralY;
            let relLateralSpeed = sqrt(relLateralX * relLateralX + relLateralY * relLateralY);

            if (relLateralSpeed > uniforms.settleThreshold) {
                let frictionDecel   = state.friction * uniforms.gravity * uniforms.simStepDuration;
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
            let settlePush      = depenetrationPush(hitCount, state.boundaryCount, uniforms.depenetrationForce, uniforms.depenetrationHardness);
            state.posX += nx * (microCorrection + settlePush);
            state.posY += ny * (microCorrection + settlePush);
        }

    }

    // Rolling friction: ground contact friction couples velX and omega.
    // Contact point velocity = velX - omega * leverY, where leverY = contactY - posY.
    // In texture Y-down coordinates, leverY is positive when contact is below the pivot.
    // Any sliding at the contact is opposed by friction, simultaneously changing velX and omega,
    // driving the system toward the rolling constraint: velX = omega * leverY.
    // This is the only mechanism changing omega — no separate collision torque block — so it also
    // generates spin when an object slides on the ground (friction accelerates rotation), and
    // drains existing spin when the object is settled.
    if (contactHits > 0u) {
        let contactCentroidY = contactSumY / f32(contactHits);
        let leverY = contactCentroidY - state.posY;  // positive when contact is below pivot (Y-down)
        if (abs(leverY) > 0.1) {
            let contactVelX  = state.velX - state.omega * leverY;
            let invEffMass   = 1.0 / selfMass + (leverY * leverY) / max(0.001, state.momentOfInertia);
            let effectiveMass = 1.0 / max(0.0001, invEffMass);
            let frictionLimit = state.friction * uniforms.gravity * uniforms.simStepDuration * selfMass;
            let impulse      = clamp(-contactVelX * effectiveMass, -frictionLimit, frictionLimit);
            state.velX  += impulse / selfMass;
            state.omega -= leverY * impulse / max(0.001, state.momentOfInertia);
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
