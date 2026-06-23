// Ticks every live particle slot each frame.
// Applies gravity, VelocityOverLifetime, noise perturbation, and collision response,
// then moves position, decrements lifetime, and marks slot inactive on expiry.

@group(0) @binding(0) var<storage, read_write> particles: array<f32>;
@group(0) @binding(1) var<storage, read> definitions: array<f32>;
@group(0) @binding(2) var<uniform> uniforms: ParticleSimUniforms;
@group(0) @binding(3) var identityTexture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(4) var physicsTexture: texture_storage_2d<rgba32float, read>;

// Returns true if the texel is occupied or out of bounds (treat edges as solid for collision).
fn isSolid(texel: vec2i, dims: vec2u) -> bool {
    if texel.x < 0 || texel.x >= i32(dims.x) || texel.y < 0 || texel.y >= i32(dims.y) {
        return true;
    }
    return isOccupiedState(textureLoad(identityTexture, texel));
}

@compute @workgroup_size(PARTICLE_WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    if id.x >= PARTICLE_MAX_COUNT { return; }

    let base = id.x * PARTICLE_FLOATS_PER_PARTICLE;
    if particles[base + 7u] < 0.5 { return; }

    var lifetime = particles[base + 4u] - uniforms.deltaTime;

    let maxLifetime = particles[base + 5u];
    let t = 1.0 - (lifetime / maxLifetime);

    let particleId = i32(particles[base + 6u] + 0.5);
    let defBase = particleId * PARTICLE_DEF_FLOATS;

    let currentPosX = particles[base + 0u];
    let currentPosY = particles[base + 1u];
    let simPosX = currentPosX - uniforms.simOriginX;
    let simPosY = currentPosY - uniforms.simOriginY;

    if lifetime <= 0.0 {
        spawnSubParticle(currentPosX, currentPosY, base, defBase, 2);
        particles[base + 7u] = 0.0;
        return;
    }

    let blendT = particles[base + 13u];

    let gravity = definitions[defBase + 2];
    let volEnabled = definitions[defBase + 30];
    let volLinearXStartFirst = definitions[defBase + 31];
    let volLinearXEndFirst = definitions[defBase + 32];
    let volLinearYStartFirst = definitions[defBase + 33];
    let volLinearYEndFirst = definitions[defBase + 34];
    let speedMultiplier = select(1.0, definitions[defBase + 35], volEnabled > 0.5);
    let volLinearXStartSecond = definitions[defBase + 36];
    let volLinearXEndSecond = definitions[defBase + 37];
    let volLinearYStartSecond = definitions[defBase + 38];
    let volLinearYEndSecond = definitions[defBase + 39];
    let inheritEnabled = definitions[defBase + 40];
    let inheritMode = definitions[defBase + 41];
    let noiseEnabled = definitions[defBase + 60];
    let noiseType = i32(definitions[defBase + 61] + 0.5);
    let noiseOctaves = i32(definitions[defBase + 62] + 0.5);
    let noisePersistence = definitions[defBase + 63];
    let noiseScale = definitions[defBase + 64];
    let noiseAmplitude = mix(definitions[defBase + 65], definitions[defBase + 66], blendT);
    let noiseScrollSpeedX = mix(definitions[defBase + 67], definitions[defBase + 69], blendT);
    let noiseScrollSpeedY = mix(definitions[defBase + 68], definitions[defBase + 70], blendT);
    let collisionEnabled = definitions[defBase + 71];

    let volLinearXStart = mix(volLinearXStartFirst, volLinearXStartSecond, blendT);
    let volLinearXEnd = mix(volLinearXEndFirst, volLinearXEndSecond, blendT);
    let volLinearYStart = mix(volLinearYStartFirst, volLinearYStartSecond, blendT);
    let volLinearYEnd = mix(volLinearYEndFirst, volLinearYEndSecond, blendT);

    var velX = particles[base + 2u];
    var velY = particles[base + 3u];

    velY = velY + gravity * uniforms.deltaTime;

    // Compute effective velocity: base vel + VOL for this frame.
    // VOL is not stored back — it is re-derived each frame so it does not accumulate.
    let volVelX = mix(volLinearXStart, volLinearXEnd, t);
    let volVelY = mix(volLinearYStart, volLinearYEnd, t);
    var effVelX = velX + volVelX;
    var effVelY = velY + volVelY;

    if inheritEnabled > 0.5 && inheritMode > 0.5 {
        let physics = textureLoad(physicsTexture, vec2i(i32(simPosX), i32(simPosY)));
        let mult = definitions[defBase + 42];
        effVelX += physics.b * mult;
        effVelY += physics.a * mult;
    }

    var newPosX = currentPosX + effVelX * speedMultiplier * uniforms.deltaTime;
    var newPosY = currentPosY + effVelY * speedMultiplier * uniforms.deltaTime;

    if noiseEnabled > 0.5 {
        let scroll = vec2f(noiseScrollSpeedX, noiseScrollSpeedY) * uniforms.time;
        let noiseCoord = vec2f(newPosX, newPosY) / noiseScale + scroll;
        let noiseVel = fbm(noiseCoord, noiseType, noiseOctaves, noisePersistence, lifetime);
        newPosX = newPosX + noiseVel.x * noiseAmplitude * uniforms.deltaTime;
        newPosY = newPosY + noiseVel.y * noiseAmplitude * uniforms.deltaTime;
    }

    if collisionEnabled > 0.5 {
        let bounce = definitions[defBase + 72];
        let dampen = definitions[defBase + 73];
        let lifetimeLoss = definitions[defBase + 74];
        let minKillSpeed = definitions[defBase + 75];

        let dims = textureDimensions(identityTexture);
        let currentTexel = vec2i(i32(simPosX), i32(simPosY));
        let simNewPosX = newPosX - uniforms.simOriginX;
        let simNewPosY = newPosY - uniforms.simOriginY;
        let newTexel = vec2i(i32(simNewPosX), i32(simNewPosY));

        let currentInBounds = currentTexel.x >= 0 && currentTexel.x < i32(dims.x)
                           && currentTexel.y >= 0 && currentTexel.y < i32(dims.y);
        let inEmitter = currentInBounds && isOccupiedState(textureLoad(identityTexture, currentTexel));

        let newInBounds = newTexel.x >= 0 && newTexel.x < i32(dims.x)
                       && newTexel.y >= 0 && newTexel.y < i32(dims.y);

        if !inEmitter && newInBounds && isOccupiedState(textureLoad(identityTexture, newTexel)) {
            spawnSubParticle(currentPosX, currentPosY, base, defBase, 1);
            let deltaTime = uniforms.deltaTime;
            let horzTexel = vec2i(i32(simPosX + effVelX * deltaTime), i32(simPosY));
            let vertTexel = vec2i(i32(simPosX), i32(simPosY + effVelY * deltaTime));
            let horzOcc = isSolid(horzTexel, dims);
            let vertOcc = isSolid(vertTexel, dims);

            let energyRetain = bounce * (1.0 - dampen);

            if !horzOcc {
                effVelY = -effVelY * energyRetain;
                newPosX = currentPosX + effVelX * deltaTime;
                newPosY = currentPosY;
            } else if !vertOcc {
                effVelX = -effVelX * energyRetain;
                newPosX = currentPosX;
                newPosY = currentPosY + effVelY * deltaTime;
            } else {
                effVelX = -effVelX * energyRetain;
                effVelY = -effVelY * energyRetain;
                newPosX = currentPosX;
                newPosY = currentPosY;
            }

            lifetime = lifetime - lifetimeLoss * maxLifetime;
            if length(vec2f(effVelX, effVelY)) < minKillSpeed {
                particles[base + 7u] = 0.0;
                return;
            }
        }
    }

    // Strip VOL back out before writing so it does not compound next frame.
    // Collision reflections are preserved because they modified effVelX/Y directly.
    particles[base + 0u] = newPosX;
    particles[base + 1u] = newPosY;
    particles[base + 2u] = effVelX - volVelX;
    particles[base + 3u] = effVelY - volVelY;
    particles[base + 4u] = lifetime;
}
