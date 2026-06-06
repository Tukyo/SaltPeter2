// Reads the sim identity texture and emits new particles into the particle buffer.
// One thread per sim cell. If the cell's material has a registered particle source,
// probabilistically spawns a particle into a hash-assigned buffer slot this frame.

@group(0) @binding(0) var identityTexture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var<storage, read> sourceLookup: array<f32>;
@group(0) @binding(2) var<storage, read> definitions: array<f32>;
@group(0) @binding(3) var<storage, read_write> particles: array<f32>;
@group(0) @binding(4) var<uniform> uniforms: ParticleEmissionUniforms;

@compute @workgroup_size(WG_SIZE, WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let dims = textureDimensions(identityTexture);
    if id.x >= dims.x || id.y >= dims.y { return; }

    let identityState = textureLoad(identityTexture, vec2i(id.xy));
    if !isOccupiedState(identityState) { return; }

    let materialId = i32(decodeMaterialId(identityState));
    let coord = vec2f(f32(id.x), f32(id.y));

    for (var slot: i32 = 0; slot < PARTICLE_MAX_PER_MATERIAL; slot++) {
        let rawId = sourceLookup[materialId * PARTICLE_MAX_PER_MATERIAL + slot];
        if rawId < 0.0 { break; }

        let particleId = i32(rawId + 0.5);
        let defBase = particleId * PARTICLE_DEF_FLOATS;
        let emissionRate = definitions[defBase + 0];
        if emissionRate <= 0.0 { continue; }

        let spawnRng = displacementHash(coord + vec2f(f32(slot) * 7.3, 0.0), uniforms.time);
        if spawnRng >= emissionRate * uniforms.deltaTime { continue; }

        let targetSlot = u32(displacementHash(coord + vec2f(f32(slot) * 13.7, 1.0), uniforms.time) * f32(PARTICLE_MAX_COUNT)) % PARTICLE_MAX_COUNT;
        let base = targetSlot * PARTICLE_FLOATS_PER_PARTICLE;
        if particles[base + 7u] > 0.5 { continue; }

        let lifetimeMin = definitions[defBase + 1];
        let lifetimeMax = definitions[defBase + 2];
        let speedMin = definitions[defBase + 3];
        let speedMax = definitions[defBase + 4];
        let shapeType = i32(definitions[defBase + 23] + 0.5);

        let lifetimeRng = hash(coord + vec2f(f32(slot) * 19.3, fract(uniforms.time * 11.9)));
        let speedRng = hash(coord + vec2f(f32(slot) * 23.7, fract(uniforms.time * 17.3)));
        let rng1 = hash(coord + vec2f(f32(slot) * 31.3, fract(uniforms.time * 23.1)));
        let rng2 = hash(coord + vec2f(f32(slot) * 37.9, fract(uniforms.time * 31.7)));
        let rng3 = hash(coord + vec2f(f32(slot) * 43.1, fract(uniforms.time * 43.3)));

        let lifetime = lifetimeMin + lifetimeRng * (lifetimeMax - lifetimeMin);
        let speed = speedMin + speedRng * (speedMax - speedMin);

        var spawnX: f32 = coord.x;
        var spawnY: f32 = coord.y;
        var velX: f32 = 0.0;
        var velY: f32 = 0.0;

        if shapeType == 1 { // cone
            let coneAngleRadians = definitions[defBase + 13];
            let dirX = definitions[defBase + 14];
            let dirY = definitions[defBase + 15];
            let coneLength = definitions[defBase + 24];
            let spread = (rng1 - 0.5) * coneAngleRadians;
            let finalAngle = atan2(dirX, dirY) + spread;
            let lengthOffset = rng2 * coneLength;
            spawnX = coord.x + dirX * lengthOffset;
            spawnY = coord.y + dirY * lengthOffset;
            velX = speed * sin(finalAngle);
            velY = speed * cos(finalAngle);
        } else if shapeType == 2 { // box
            let boxWidth = definitions[defBase + 25];
            let boxHeight = definitions[defBase + 26];
            spawnX = coord.x + (rng1 - 0.5) * boxWidth;
            spawnY = coord.y + (rng2 - 0.5) * boxHeight;
            let angle = rng3 * radians(360.0);
            velX = speed * sin(angle);
            velY = speed * cos(angle);
        } else if shapeType == 3 { // circle
            let circleRadius = definitions[defBase + 27];
            let angle = rng1 * radians(360.0);
            let radius = sqrt(rng2) * circleRadius;
            spawnX = coord.x + radius * cos(angle);
            spawnY = coord.y + radius * sin(angle);
            velX = speed * cos(angle);
            velY = speed * sin(angle);
        } else { // no shape — random direction
            let angle = rng1 * radians(360.0);
            velX = speed * sin(angle);
            velY = speed * cos(angle);
        }

        particles[base + 0u] = spawnX;
        particles[base + 1u] = spawnY;
        particles[base + 2u] = velX;
        particles[base + 3u] = velY;
        particles[base + 4u] = lifetime;
        particles[base + 5u] = lifetime;
        particles[base + 6u] = f32(particleId);
        particles[base + 7u] = 1.0;
    }
}
