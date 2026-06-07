// Spawns a sub-emitter child particle at the given position.
// Reads the parent's subEmitter definition fields, rolls probability,
// then writes a new particle into a hash-selected free slot.
// condition: 0 = Birth, 1 = Collision, 2 = Death
//
// Inherit mask bits (match ParticleDefinitionBuffer inheritBits):
//   0=main, 1=visual, 2=emission, 3=shape, 4=subEmitter,
//   5=velocityOverLifetime, 6=inheritVelocity, 7=colorOverLifetime,
//   8=noise, 9=collision
fn spawnSubParticle(posX: f32, posY: f32, parentBase: u32, parentDefBase: i32, condition: i32) {
    let subEnabled = definitions[parentDefBase + 76];
    if subEnabled < 0.5 { return; }
    let subCondition = i32(definitions[parentDefBase + 77] + 0.5);
    if subCondition != condition { return; }

    let probability = definitions[parentDefBase + 79];
    let probRng = hash(vec2f(posX + f32(parentBase) * 0.1, posY) + vec2f(f32(condition) * 7.3, uniforms.time));
    if probRng >= probability { return; }

    let childId = i32(definitions[parentDefBase + 78] + 0.5);
    let childDefBase = childId * PARTICLE_DEF_FLOATS;

    let inheritMask = u32(definitions[parentDefBase + 80] + 0.5);
    let mainDefBase = select(childDefBase, parentDefBase, (inheritMask & 1u) != 0u);
    let shapeDefBase = select(childDefBase, parentDefBase, (inheritMask & 8u) != 0u);

    let lifetimeMin = definitions[mainDefBase + 4];
    let lifetimeMax = definitions[mainDefBase + 5];
    let speedMin = definitions[mainDefBase + 6];
    let speedMax = definitions[mainDefBase + 7];

    let rngSeed = vec2f(posX + f32(parentBase) * 0.07, posY + uniforms.time * 0.01);
    let rngA = hash(rngSeed + vec2f(1.1, 0.0));
    let rngB = hash(rngSeed + vec2f(0.0, 1.1));
    let rng1 = hash(rngSeed + vec2f(2.3, 0.7));
    let rng2 = hash(rngSeed + vec2f(0.7, 2.3));
    let rng3 = hash(rngSeed + vec2f(3.7, 1.3));

    let childLifetime = lifetimeMin + rngA * (lifetimeMax - lifetimeMin);
    let speed = speedMin + rngB * (speedMax - speedMin);

    let spawn = calculateSpawn(posX, posY, speed, shapeDefBase, rng1, rng2, rng3);
    let spawnX = spawn.x;
    let spawnY = spawn.y;
    var velX = spawn.z;
    var velY = spawn.w;

    if (inheritMask & 1u) != 0u {
        velX += particles[parentBase + 2u];
        velY += particles[parentBase + 3u];
    }

    let slotRng = hash(rngSeed + vec2f(5.1, 5.1));
    let targetSlot = u32(slotRng * f32(PARTICLE_MAX_COUNT)) % PARTICLE_MAX_COUNT;
    let childBase = targetSlot * PARTICLE_FLOATS_PER_PARTICLE;
    if particles[childBase + 7u] > 0.5 { return; }

    let inheritColor = ((inheritMask & 2u) != 0u) || ((inheritMask & 128u) != 0u);

    particles[childBase + 0u] = spawnX;
    particles[childBase + 1u] = spawnY;
    particles[childBase + 2u] = velX;
    particles[childBase + 3u] = velY;
    particles[childBase + 4u] = childLifetime;
    particles[childBase + 5u] = childLifetime;
    particles[childBase + 6u] = f32(childId);
    particles[childBase + 7u] = 1.0;
    particles[childBase + 8u] = select(0.0, particles[parentBase + 8u], inheritColor);
    particles[childBase + 9u] = select(0.0, particles[parentBase + 9u], inheritColor);
    particles[childBase + 10u] = select(0.0, particles[parentBase + 10u], inheritColor);
    particles[childBase + 11u] = select(0.0, particles[parentBase + 11u], inheritColor);
    particles[childBase + 12u] = select(0.0, 1.0, inheritColor);
    particles[childBase + 13u] = hash(rngSeed + vec2f(9.1, 4.7));
}
