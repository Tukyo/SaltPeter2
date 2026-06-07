// Reads active GO emitter slots from the emitter buffer and spawns particles.
// One thread per emitter slot. Skips inactive slots.

@group(0) @binding(0) var<storage, read> emitterBuffer: array<f32>;
@group(0) @binding(1) var<storage, read> definitions: array<f32>;
@group(0) @binding(2) var<storage, read_write> particles: array<f32>;
@group(0) @binding(3) var<uniform> uniforms: ParticleEmissionUniforms;
@group(0) @binding(4) var physicsTexture: texture_storage_2d<rgba32float, read>;

@compute @workgroup_size(PARTICLE_WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    if id.x >= PARTICLE_GO_EMITTER_CAPACITY { return; }

    let slotBase = id.x * 4u;
    let posX = emitterBuffer[slotBase + 0u];
    let posY = emitterBuffer[slotBase + 1u];
    let emitterId = i32(emitterBuffer[slotBase + 2u] + 0.5);
    let isActive = emitterBuffer[slotBase + 3u];
    if isActive < 0.5 { return; }

    let defBase = emitterId * PARTICLE_DEF_FLOATS;

    let emissionEnabled = definitions[defBase + 8];
    if emissionEnabled < 0.5 { return; }
    let emissionRate = definitions[defBase + 9];
    if emissionRate <= 0.0 { return; }

    let seed = vec2f(posX + f32(id.x) * 7.3, posY + f32(id.x) * 11.1);
    let spawnRng = displacementHash(seed, uniforms.time);
    if spawnRng >= emissionRate * uniforms.deltaTime { return; }

    spawnParticle(posX, posY, defBase, emitterId, seed, uniforms.time);
}
