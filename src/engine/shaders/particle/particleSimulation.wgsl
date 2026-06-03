// Ticks every live particle slot each frame.
// Applies gravity, VelocityOverLifetime, noise perturbation, and collision response,
// then moves position, decrements lifetime, and marks slot inactive on expiry.

@group(0) @binding(0) var<storage, read_write> particles:      array<f32>;
@group(0) @binding(1) var<storage, read>       definitions:    array<f32>;
@group(0) @binding(2) var<uniform>             uniforms:       ParticleSimUniforms;
@group(0) @binding(3) var                      identityTexture: texture_storage_2d<rgba8unorm, read>;

fn gradNoise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    let a = hash(i + vec2f(0.0, 0.0));
    let b = hash(i + vec2f(1.0, 0.0));
    let c = hash(i + vec2f(0.0, 1.0));
    let d = hash(i + vec2f(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}

fn worleyNoise(p: vec2f) -> f32 {
    let cell = floor(p);
    var minDist = 8.0;
    for (var dy: i32 = -1; dy <= 1; dy++) {
        for (var dx: i32 = -1; dx <= 1; dx++) {
            let neighbor = cell + vec2f(f32(dx), f32(dy));
            let point    = neighbor + vec2f(hash(neighbor), hash(neighbor + vec2f(17.3, 31.7)));
            minDist = min(minDist, length(p - point));
        }
    }
    return clamp(minDist, 0.0, 1.0) * 2.0 - 1.0;
}

fn sampleNoiseX(p: vec2f, noiseType: i32) -> f32 {
    if noiseType == 0 { return gradNoise(p); }
    if noiseType == 1 { return 1.0 - abs(gradNoise(p)); }
    if noiseType == 2 { return worleyNoise(p); }
    if noiseType == 3 { return 1.0 - worleyNoise(p); }
    return hash(p) * 2.0 - 1.0;
}

fn sampleNoiseY(p: vec2f, noiseType: i32) -> f32 {
    if noiseType == 0 { return gradNoise(p + vec2f(31.7, 17.3)); }
    if noiseType == 1 { return 1.0 - abs(gradNoise(p + vec2f(31.7, 17.3))); }
    if noiseType == 2 { return worleyNoise(p + vec2f(31.7, 17.3)); }
    if noiseType == 3 { return 1.0 - worleyNoise(p + vec2f(31.7, 17.3)); }
    return hash(p + vec2f(31.7, 17.3)) * 2.0 - 1.0;
}

fn fbm(baseCoord: vec2f, noiseType: i32, octaves: i32, persistence: f32, timeSeed: f32) -> vec2f {
    var totalX      = 0.0;
    var totalY      = 0.0;
    var amplitude   = 1.0;
    var frequency   = 1.0;
    var totalWeight = 0.0;

    for (var i: i32 = 0; i < 8; i++) {
        if i >= octaves { break; }
        let p   = baseCoord * frequency + vec2f(f32(i) * 13.7, timeSeed * 1.618 + f32(i) * 7.3);
        totalX      += sampleNoiseX(p, noiseType) * amplitude;
        totalY      += sampleNoiseY(p, noiseType) * amplitude;
        totalWeight += amplitude;
        amplitude   *= persistence;
        frequency   *= 2.0;
    }

    if totalWeight <= 0.0 { return vec2f(0.0); }
    return vec2f(totalX, totalY) / totalWeight;
}

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

    var lifetime    = particles[base + 4u] - uniforms.deltaTime;
    if lifetime <= 0.0 {
        particles[base + 7u] = 0.0;
        return;
    }

    let maxLifetime = particles[base + 5u];
    let t           = 1.0 - (lifetime / maxLifetime);

    let particleId = i32(particles[base + 6u] + 0.5);
    let defBase    = particleId * PARTICLE_DEF_FLOATS;

    let gravity          = definitions[defBase + 12];
    let volLinearXStart  = definitions[defBase + 16];
    let volLinearXEnd    = definitions[defBase + 17];
    let volLinearYStart  = definitions[defBase + 18];
    let volLinearYEnd    = definitions[defBase + 19];
    let speedMultiplier  = definitions[defBase + 20];
    let noiseEnabled      = definitions[defBase + 28];
    let noiseType         = i32(definitions[defBase + 29] + 0.5);
    let noiseOctaves      = i32(definitions[defBase + 30] + 0.5);
    let noisePersistence  = definitions[defBase + 31];
    let noiseScale        = definitions[defBase + 32];
    let noiseAmplitude    = definitions[defBase + 33];
    let noiseScrollSpeedX = definitions[defBase + 48];
    let noiseScrollSpeedY = definitions[defBase + 49];
    let collisionEnabled = definitions[defBase + 43];

    var velX = particles[base + 2u];
    var velY = particles[base + 3u];

    velY = velY + gravity * uniforms.deltaTime;

    let volVelX = mix(volLinearXStart, volLinearXEnd, t);
    let volVelY = mix(volLinearYStart, volLinearYEnd, t);

    let currentPosX = particles[base + 0u];
    let currentPosY = particles[base + 1u];

    var newPosX = currentPosX + (velX * speedMultiplier + volVelX) * uniforms.deltaTime;
    var newPosY = currentPosY + (velY * speedMultiplier + volVelY) * uniforms.deltaTime;

    if noiseEnabled > 0.5 {
        let scroll     = vec2f(noiseScrollSpeedX, noiseScrollSpeedY) * uniforms.time;
        let noiseCoord = vec2f(newPosX, newPosY) / noiseScale + scroll;
        let noiseVel   = fbm(noiseCoord, noiseType, noiseOctaves, noisePersistence, lifetime);
        newPosX = newPosX + noiseVel.x * noiseAmplitude * uniforms.deltaTime;
        newPosY = newPosY + noiseVel.y * noiseAmplitude * uniforms.deltaTime;
    }

    if collisionEnabled > 0.5 {
        let bounce       = definitions[defBase + 44];
        let dampen       = definitions[defBase + 45];
        let lifetimeLoss = definitions[defBase + 46];
        let minKillSpeed = definitions[defBase + 47];

        let dims        = textureDimensions(identityTexture);
        let currentTexel = vec2i(i32(currentPosX), i32(currentPosY));
        let newTexel     = vec2i(i32(newPosX), i32(newPosY));

        let currentInBounds = currentTexel.x >= 0 && currentTexel.x < i32(dims.x)
                           && currentTexel.y >= 0 && currentTexel.y < i32(dims.y);
        let inEmitter = currentInBounds && isOccupiedState(textureLoad(identityTexture, currentTexel));

        let newInBounds = newTexel.x >= 0 && newTexel.x < i32(dims.x)
                       && newTexel.y >= 0 && newTexel.y < i32(dims.y);

        if !inEmitter && newInBounds && isOccupiedState(textureLoad(identityTexture, newTexel)) {
            let deltaTime = uniforms.deltaTime;
            let horzTexel = vec2i(i32(currentPosX + velX * deltaTime), i32(currentPosY));
            let vertTexel = vec2i(i32(currentPosX), i32(currentPosY + velY * deltaTime));
            let horzOcc   = isSolid(horzTexel, dims);
            let vertOcc   = isSolid(vertTexel, dims);

            let energyRetain = bounce * (1.0 - dampen);

            if !horzOcc {
                velY    = -velY * energyRetain;
                newPosX = currentPosX + velX * deltaTime;
                newPosY = currentPosY;
            } else if !vertOcc {
                velX    = -velX * energyRetain;
                newPosX = currentPosX;
                newPosY = currentPosY + velY * deltaTime;
            } else {
                velX    = -velX * energyRetain;
                velY    = -velY * energyRetain;
                newPosX = currentPosX;
                newPosY = currentPosY;
            }

            lifetime = lifetime - lifetimeLoss * maxLifetime;
            if length(vec2f(velX, velY)) < minKillSpeed {
                particles[base + 7u] = 0.0;
                return;
            }
        }
    }

    particles[base + 0u] = newPosX;
    particles[base + 1u] = newPosY;
    particles[base + 2u] = velX;
    particles[base + 3u] = velY;
    particles[base + 4u] = lifetime;
}
