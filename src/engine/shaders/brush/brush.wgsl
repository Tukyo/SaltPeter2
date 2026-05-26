@group(0) @binding(0) var identityTexture:                          texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var nextIdentityTexture:                      texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> brush:                        BrushUniforms;
@group(0) @binding(3) var physicsTexture:                        texture_storage_2d<rgba32float, read>;
@group(0) @binding(4) var nextPhysicsTexture:                    texture_storage_2d<rgba32float, write>;
@group(0) @binding(5) var<storage, read> physicsMaterials:       array<MaterialPhysicsEntry>;
@group(0) @binding(6) var cellStateTexture:                      texture_storage_2d<rgba32float, read>;
@group(0) @binding(7) var nextCellStateTexture:                  texture_storage_2d<rgba32float, write>;
@group(0) @binding(8) var<storage, read> materialStates:         array<MaterialStateEntry>;

@compute @workgroup_size(WG_SIZE, WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let res   = vec2f(textureDimensions(identityTexture));
    let coord = vec2f(f32(id.x), f32(id.y));

    if !inBounds(coord, res) { return; }

    let currentState   = textureLoad(identityTexture,   vec2i(id.xy));
    let currentPhysics = textureLoad(physicsTexture, vec2i(id.xy));

    let currentCellState = textureLoad(cellStateTexture, vec2i(id.xy));

    var inBrush: bool;
    if brush.shape < 0.5 {
        inBrush = distance(coord + vec2f(0.5), vec2f(brush.mouseX, brush.mouseY)) < brush.radius;
    } else {
        let halfR  = floor(brush.radius / 2.0);
        let offset = brush.radius - 2.0 * halfR;
        let ox = floor(brush.mouseX - 0.5) - halfR;
        let oy = floor(brush.mouseY - 0.5) - halfR + 1.0 - offset;
        inBrush = coord.x >= ox && coord.x < ox + brush.radius && coord.y >= oy && coord.y < oy + brush.radius;
    }
    if !inBrush {
        textureStore(nextIdentityTexture,  vec2i(id.xy), currentState);
        textureStore(nextPhysicsTexture,   vec2i(id.xy), currentPhysics);
        textureStore(nextCellStateTexture, vec2i(id.xy), currentCellState);
        return;
    }

    if !isAirMaterial(brush.materialId) && !isRegisteredMaterialId(brush.materialId) {
        textureStore(nextIdentityTexture,  vec2i(id.xy), currentState);
        textureStore(nextPhysicsTexture,   vec2i(id.xy), currentPhysics);
        textureStore(nextCellStateTexture, vec2i(id.xy), currentCellState);
        return;
    }

    let brushSeed   = floor(brush.time * BRUSH_RANDOM_RATE);
    let brushRandom = hash(coord + vec2f(brushSeed, brushSeed * RANDOM_DECORRELATION));
    var shouldPlace = brushRandom < brush.density;

    if !shouldPlace &&
       !isAirMaterial(brush.materialId) &&
       isOccupiedState(currentState) &&
       !isMaterialId(getStateMaterialId(currentState), brush.materialId) {
        shouldPlace = true;
    }

    if shouldPlace {
        let matIdx            = clamp(i32(floor(brush.materialId + 0.5)), 0, MATERIAL_COUNT - 1);
        let restingTemp       = physicsMaterials[matIdx].restingTemperature;
        let normalizedDensity = physicsMaterials[matIdx].density / MAX_DENSITY;
        let stateBase     = getMaterialStateBase(brush.materialId);
        let spawnLifetime = select(0.0, 1.0, materialStates[stateBase].lifetime > 0.0);
        let colorSeed   = select(chooseMaterialColorSeed(brush.materialId, coord), (brush.colorVariant + 0.5) / COLORS_PER_MATERIAL, brush.brushType >= 0.5);
        var newIdentity = select(AIR_STATE, makeStateWithVariant(brush.materialId, colorSeed, brush.variantId), !isAirMaterial(brush.materialId));
        if !isAirMaterial(brush.materialId) { newIdentity.a = brush.occupancy / 255.0; }
        textureStore(nextIdentityTexture,  vec2i(id.xy), newIdentity);
        textureStore(nextPhysicsTexture,   vec2i(id.xy), vec4f(restingTemp, normalizedDensity, 0.0, 0.0));
        textureStore(nextCellStateTexture, vec2i(id.xy), vec4f(1.0, spawnLifetime, 0.0, 0.0));
    } else {
        textureStore(nextIdentityTexture,  vec2i(id.xy), currentState);
        textureStore(nextPhysicsTexture,   vec2i(id.xy), currentPhysics);
        textureStore(nextCellStateTexture, vec2i(id.xy), currentCellState);
    }
}
