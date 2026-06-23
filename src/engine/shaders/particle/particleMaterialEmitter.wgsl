// Reads the sim identity texture and emits new particles into the particle buffer.
// One thread per sim cell. If the cell's material has a registered particle source,
// probabilistically spawns a particle into a hash-assigned buffer slot this frame.

@group(0) @binding(0) var identityTexture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var<storage, read> sourceLookup: array<f32>;
@group(0) @binding(2) var<storage, read> definitions: array<f32>;
@group(0) @binding(3) var<storage, read_write> particles: array<f32>;
@group(0) @binding(4) var<uniform> uniforms: ParticleEmissionUniforms;
@group(0) @binding(5) var physicsTexture: texture_storage_2d<rgba32float, read>;

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

        let emissionEnabled = definitions[defBase + 8];
        if emissionEnabled < 0.5 { continue; }
        let emissionRate = definitions[defBase + 9];
        if emissionRate <= 0.0 { continue; }

        let spawnRng = displacementHash(coord + vec2f(f32(slot) * 7.3, 0.0), uniforms.time);
        if spawnRng >= emissionRate * uniforms.deltaTime { continue; }

        let worldCoord = coord + vec2f(uniforms.simOriginX, uniforms.simOriginY);
        spawnParticle(worldCoord.x, worldCoord.y, uniforms.simOriginX, uniforms.simOriginY, defBase, particleId, coord + vec2f(f32(slot) * 11.1, f32(slot) * 7.3), uniforms.time);
    }
}
