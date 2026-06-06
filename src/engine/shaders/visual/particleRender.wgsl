// Scatter-writes active particle pixels into the particle layer texture.
// One thread per particle slot. Inactive slots are skipped.
// Color is sourced from visualMaterialId (material color table) or raw RGBA from the definition,
// then multiplied by the ColorOverLifetime gradient if that module is enabled.

@group(0) @binding(0) var<storage, read> particles: array<f32>;
@group(0) @binding(1) var<storage, read> definitions: array<f32>;
@group(0) @binding(2) var<storage, read> materials: array<VisualEntry>;
@group(0) @binding(3) var particleTexture: texture_storage_2d<rgba8unorm, write>;

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
    let texX = i32(posX);
    let texY = i32(posY);
    if texX < 0 || texX >= i32(dims.x) || texY < 0 || texY >= i32(dims.y) { return; }

    let defBase = particleId * PARTICLE_DEF_FLOATS;
    let visualMaterialId = i32(definitions[defBase + 7] + 0.5);

    var color: vec4f;
    if visualMaterialId >= 0 {
        let safeMaterialId = clamp(visualMaterialId, 0, MATERIAL_COUNT - 1);
        let colorSeed = fract(f32(id.x) * 0.6180339887);
        let colorIdx = clamp(i32(floor(colorSeed * COLORS_PER_MATERIAL)), 0, i32(COLORS_PER_MATERIAL) - 1);
        color = materials[safeMaterialId].colors[colorIdx];
    } else {
        color = vec4f(
            definitions[defBase + 8],
            definitions[defBase + 9],
            definitions[defBase + 10],
            definitions[defBase + 11],
        );
    }

    let colorOverLifetimeEnabled = definitions[defBase + 34];
    if colorOverLifetimeEnabled > 0.5 {
        let t = 1.0 - (lifetimeRemaining / maxLifetime);
        let coltStart = vec4f(
            definitions[defBase + 35],
            definitions[defBase + 36],
            definitions[defBase + 37],
            definitions[defBase + 38],
        );
        let coltEnd = vec4f(
            definitions[defBase + 39],
            definitions[defBase + 40],
            definitions[defBase + 41],
            definitions[defBase + 42],
        );
        color = color * mix(coltStart, coltEnd, t);
    }

    textureStore(particleTexture, vec2i(texX, texY), color);
}
