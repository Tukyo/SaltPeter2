// Scatter-writes active particle pixels into the particle layer texture.
// One thread per particle slot. Inactive slots are skipped.
// Color is sourced from visualMaterialId (material color table) or raw RGBA from the definition,
// then multiplied by the ColorOverLifetime gradient if that module is enabled.

@group(0) @binding(0) var<storage, read_write> particles: array<f32>;
@group(0) @binding(1) var<storage, read> definitions: array<f32>;
@group(0) @binding(2) var<storage, read> materials: array<VisualEntry>;
@group(0) @binding(3) var particleTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(4) var<uniform> uniforms: ParticleRenderUniforms;

@compute @workgroup_size(PARTICLE_WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    if id.x >= PARTICLE_MAX_COUNT { return; }

    let base = id.x * PARTICLE_FLOATS_PER_PARTICLE;
    if particles[base + 7u] < 0.5 { return; }

    let posX = particles[base + 0u];
    let posY = particles[base + 1u];
    let lifetimeRemaining = particles[base + 4u];
    let maxLifetime = particles[base + 5u];
    let particleId = i32(particles[base + 6u] + 0.5);

    let dims = textureDimensions(particleTexture);
    let texX = i32(posX) - i32(uniforms.simOriginX);
    let texY = i32(posY) - i32(uniforms.simOriginY);
    if texX < 0 || texX >= i32(dims.x) || texY < 0 || texY >= i32(dims.y) { return; }

    let defBase = particleId * PARTICLE_DEF_FLOATS;
    let visualEnabled = definitions[defBase + 11];
    let materialId = i32(definitions[defBase + 12] + 0.5);
    let useBufferColor = particles[base + 12u] > 0.5;
    let blendT = particles[base + 13u];

    var color: vec4f;
    if useBufferColor {
        color = vec4f(particles[base + 8u], particles[base + 9u], particles[base + 10u], particles[base + 11u]);
    } else if visualEnabled < 0.5 {
        return;
    } else if materialId >= 0 {
        let safeMaterialId = clamp(materialId, 0, MATERIAL_COUNT - 1);
        let colorSeed = fract(f32(id.x) * 0.6180339887);
        let colorIdx = clamp(i32(floor(colorSeed * COLORS_PER_MATERIAL)), 0, i32(COLORS_PER_MATERIAL) - 1);
        color = materials[safeMaterialId].colors[colorIdx];
    } else {
        let colorFirst = vec4f(definitions[defBase + 13], definitions[defBase + 14], definitions[defBase + 15], definitions[defBase + 16]);
        let colorSecond = vec4f(definitions[defBase + 17], definitions[defBase + 18], definitions[defBase + 19], definitions[defBase + 20]);
        color = mix(colorFirst, colorSecond, blendT);
    }

    let colorOverLifetimeEnabled = definitions[defBase + 43];
    if colorOverLifetimeEnabled > 0.5 {
        let t = 1.0 - (lifetimeRemaining / maxLifetime);
        let coltStartFirst = vec4f(definitions[defBase + 44], definitions[defBase + 45], definitions[defBase + 46], definitions[defBase + 47]);
        let coltEndFirst = vec4f(definitions[defBase + 48], definitions[defBase + 49], definitions[defBase + 50], definitions[defBase + 51]);
        let coltStartSecond = vec4f(definitions[defBase + 52], definitions[defBase + 53], definitions[defBase + 54], definitions[defBase + 55]);
        let coltEndSecond = vec4f(definitions[defBase + 56], definitions[defBase + 57], definitions[defBase + 58], definitions[defBase + 59]);
        let coltStart = mix(coltStartFirst, coltStartSecond, blendT);
        let coltEnd = mix(coltEndFirst, coltEndSecond, blendT);
        color = color * mix(coltStart, coltEnd, t);
    }

    if !useBufferColor {
        particles[base + 8u] = color.r;
        particles[base + 9u] = color.g;
        particles[base + 10u] = color.b;
        particles[base + 11u] = color.a;
    }

    textureStore(particleTexture, vec2i(texX, texY), color);
}
