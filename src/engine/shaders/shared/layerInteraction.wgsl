@group(0) @binding(0) var goOwnershipTexture: texture_storage_2d<r32uint,    read>;
@group(0) @binding(1) var goIdentityTexture:  texture_storage_2d<rgba8unorm,  read>;
@group(0) @binding(2) var simIdentityTexture: texture_storage_2d<rgba8unorm,  read>;

@compute @workgroup_size(WG_SIZE, WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let dims = textureDimensions(goOwnershipTexture);
    if id.x >= dims.x || id.y >= dims.y { return; }

    let coord      = vec2i(i32(id.x), i32(id.y));
    let ownerValue = textureLoad(goOwnershipTexture, coord).r;
    _ = textureLoad(goIdentityTexture,  coord);
    _ = textureLoad(simIdentityTexture, coord);
    if !isOwnedCell(ownerValue) { return; }
}
