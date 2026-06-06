// Shared cell write helper. Called by brush.wgsl and any other placement entrypoint.
// Writes identity, physics, and cell state for a single cell at the given coordinate.

fn instantiateCell(coord: vec2i, materialId: f32, occupancy: f32, variantId: f32, colorSeed: f32) {
    let matIdx = clamp(i32(floor(materialId + 0.5)), 0, MATERIAL_COUNT - 1);
    let restingTemp = physicsMaterials[matIdx].restingTemperature;
    let density = physicsMaterials[matIdx].density / MAX_DENSITY;
    let stateBase = getMaterialStateBase(materialId);
    let spawnLifetime = select(0.0, 1.0, materialStates[stateBase].lifetime > 0.0);

    var newIdentity = makeStateWithVariant(materialId, colorSeed, variantId);
    newIdentity.a = occupancy / 255.0;

    textureStore(nextIdentityTexture, coord, newIdentity);
    textureStore(nextPhysicsTexture, coord, vec4f(restingTemp, density, 0.0, 0.0));
    textureStore(nextCellStateTexture, coord, vec4f(1.0, spawnLifetime, 0.0, 0.0));
}
