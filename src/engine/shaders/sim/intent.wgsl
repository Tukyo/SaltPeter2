// Bindings referenced by shared/phase helpers assembled into the intent shader.
@group(0) @binding(0) var identityTexture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var intentTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<storage, read> physicsMaterials: array<MaterialPhysicsEntry>;
@group(0) @binding(3) var<storage, read> materialSimulationData: array<f32>;

@group(0) @binding(4) var<uniform> uniforms: IntentUniforms;
@group(0) @binding(5) var physicsTexture: texture_storage_2d<rgba32float, read>;
@group(0) @binding(6) var<storage, read> reactionLookup: array<f32>;

@compute @workgroup_size(WG_SIZE, WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let res = vec2f(textureDimensions(identityTexture));
    let coord = vec2f(f32(id.x), f32(id.y));

    if !inBounds(coord, res) { return; }

    textureStore(
        intentTexture,
        vec2i(id.xy),
        makeMaterialIntentState(
            chooseIntentForState(
                coord,
                res,
                getGravityDirection(uniforms.gravity),
                uniforms.time,
                textureLoad(identityTexture, vec2i(id.xy))
            )
        )
    );
}
