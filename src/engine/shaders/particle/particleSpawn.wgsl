// Shared particle spawn helper. Requires definitions, particles, and physicsTexture
// bindings to be declared in the enclosing shader program.
// Called by both the material emission pass and the GO emission pass.
fn spawnParticle(originX: f32, originY: f32, defBase: i32, particleId: i32, seed: vec2f, time: f32) {
    let targetSlot = u32(displacementHash(seed + vec2f(13.7, 1.0), time) * f32(PARTICLE_MAX_COUNT)) % PARTICLE_MAX_COUNT;
    let base = targetSlot * PARTICLE_FLOATS_PER_PARTICLE;
    if particles[base + 7u] > 0.5 { return; }

    let lifetimeMin = definitions[defBase + 4];
    let lifetimeMax = definitions[defBase + 5];
    let speedMin = definitions[defBase + 6];
    let speedMax = definitions[defBase + 7];
    let lifetimeRng = hash(seed + vec2f(19.3, fract(time * 11.9)));
    let speedRng = hash(seed + vec2f(23.7, fract(time * 17.3)));
    let rng1 = hash(seed + vec2f(31.3, fract(time * 23.1)));
    let rng2 = hash(seed + vec2f(37.9, fract(time * 31.7)));
    let rng3 = hash(seed + vec2f(43.1, fract(time * 43.3)));

    let lifetime = lifetimeMin + lifetimeRng * (lifetimeMax - lifetimeMin);
    let speed = speedMin + speedRng * (speedMax - speedMin);

    let spawn = calculateSpawn(originX, originY, speed, defBase, rng1, rng2, rng3);
    let spawnX = spawn.x;
    let spawnY = spawn.y;
    var velX = spawn.z;
    var velY = spawn.w;

    let inheritEnabled = definitions[defBase + 40];
    let inheritMode = definitions[defBase + 41];
    if inheritEnabled > 0.5 && inheritMode < 0.5 {
        let physics = textureLoad(physicsTexture, vec2i(i32(originX), i32(originY)));
        let mult = definitions[defBase + 42];
        velX += physics.b * mult;
        velY += physics.a * mult;
    }

    particles[base + 0u] = spawnX;
    particles[base + 1u] = spawnY;
    particles[base + 2u] = velX;
    particles[base + 3u] = velY;
    particles[base + 4u] = lifetime;
    particles[base + 5u] = lifetime;
    particles[base + 6u] = f32(particleId);
    particles[base + 7u] = 1.0;
    particles[base + 8u] = 0.0;
    particles[base + 9u] = 0.0;
    particles[base + 10u] = 0.0;
    particles[base + 11u] = 0.0;
    particles[base + 12u] = 0.0;
    particles[base + 13u] = hash(seed + vec2f(67.1, fract(time * 59.3)));

    spawnSubParticle(spawnX, spawnY, base, defBase, 0);
}
