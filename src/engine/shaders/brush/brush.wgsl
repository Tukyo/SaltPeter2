@group(0) @binding(0) var identityTexture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var nextIdentityTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> brush: BrushUniforms;
@group(0) @binding(3) var physicsTexture: texture_storage_2d<rgba32float, read>;
@group(0) @binding(4) var nextPhysicsTexture: texture_storage_2d<rgba32float, write>;
@group(0) @binding(5) var<storage, read> physicsMaterials: array<MaterialPhysicsEntry>;
@group(0) @binding(6) var cellStateTexture: texture_storage_2d<rgba32float, read>;
@group(0) @binding(7) var nextCellStateTexture: texture_storage_2d<rgba32float, write>;
@group(0) @binding(8) var<storage, read> materialStates: array<MaterialStateEntry>;

@compute @workgroup_size(WG_SIZE, WG_SIZE)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let res = vec2f(textureDimensions(identityTexture));
    let coord = vec2f(f32(id.x), f32(id.y));

    if !inBounds(coord, res) { return; }

    let currentState = textureLoad(identityTexture, vec2i(id.xy));
    let currentPhysics = textureLoad(physicsTexture, vec2i(id.xy));

    let currentCellState = textureLoad(cellStateTexture, vec2i(id.xy));

    var inBrush: bool;
    if brush.shape < 0.5 {
        inBrush = distance(coord + vec2f(0.5), vec2f(brush.mouseX, brush.mouseY)) < brush.radius / 2.0;
    } else {
        let halfR = floor(brush.radius / 2.0);
        let offset = brush.radius - 2.0 * halfR;
        let ox = floor(brush.mouseX - 0.5) - halfR;
        let oy = floor(brush.mouseY - 0.5) - halfR + 1.0 - offset;
        inBrush = coord.x >= ox && coord.x < ox + brush.radius && coord.y >= oy && coord.y < oy + brush.radius;
    }
    if !inBrush {
        textureStore(nextIdentityTexture, vec2i(id.xy), currentState);
        textureStore(nextPhysicsTexture, vec2i(id.xy), currentPhysics);
        textureStore(nextCellStateTexture, vec2i(id.xy), currentCellState);
        return;
    }

    if brush.marginSize > 0.5 {
        let m = brush.marginSize;
        if coord.x < m || coord.y < m || coord.x >= res.x - m || coord.y >= res.y - m {
            textureStore(nextIdentityTexture, vec2i(id.xy), currentState);
            textureStore(nextPhysicsTexture, vec2i(id.xy), currentPhysics);
            textureStore(nextCellStateTexture, vec2i(id.xy), currentCellState);
            return;
        }
    }

    if !isAirMaterial(brush.materialId) && !isRegisteredMaterialId(brush.materialId) {
        textureStore(nextIdentityTexture, vec2i(id.xy), currentState);
        textureStore(nextPhysicsTexture, vec2i(id.xy), currentPhysics);
        textureStore(nextCellStateTexture, vec2i(id.xy), currentCellState);
        return;
    }

    let brushSeed = floor(brush.time * BRUSH_RANDOM_RATE);
    let brushRandom = hash(coord + vec2f(brushSeed, brushSeed * RANDOM_DECORRELATION));
    var shouldPlace = brushRandom < brush.density;

    if !shouldPlace &&
       !isAirMaterial(brush.materialId) &&
       isOccupiedState(currentState) &&
       !isMaterialId(getStateMaterialId(currentState), brush.materialId) {
        shouldPlace = true;
    }

    // mask (paintMode=1): only paint on empty cells
    if brush.paintMode >= 0.5 && brush.paintMode < 1.5 && !isAirMaterial(brush.materialId) && isOccupiedState(currentState) {
        shouldPlace = false;
    }
    // overlay (paintMode=2): only paint on occupied cells
    if brush.paintMode >= 1.5 && !isAirMaterial(brush.materialId) && !isOccupiedState(currentState) {
        shouldPlace = false;
    }
    // overlay filter: restrict to cells matching the active material and variant
    if brush.paintMode >= 1.5 && brush.overlayFilter >= 0.5 && shouldPlace && !isAirMaterial(brush.materialId) {
        let cellMaterialId = getStateMaterialId(currentState);
        let cellVariantId = decodeVariantId(currentState);
        if !isMaterialId(cellMaterialId, brush.materialId) || !isMaterialId(cellVariantId, brush.variantId) {
            shouldPlace = false;
        }
    }

    if shouldPlace {
        var colorSeed: f32;
        if brush.brushType < 0.5 {
            colorSeed = chooseMaterialColorSeed(brush.materialId, coord);
        } else if brush.brushType < 1.5 {
            colorSeed = (brush.colorVariant + 0.5) / COLORS_PER_MATERIAL;
        } else if brush.brushType < 2.5 {
            colorSeed = hash(coord + vec2f(37.13, 61.91));
        } else if brush.brushType < 3.5 {
            let blockCoord = floor(coord / 2.0);
            let sizeHash = hash(blockCoord + vec2f(7.31, 43.17));
            let cellCoord = select(coord, blockCoord, sizeHash < 0.6);
            let blockHash = hash(cellCoord + vec2f(91.37, 17.73));
            let c0 = brush.colorWeight0;
            let c1 = c0 + brush.colorWeight1;
            let c2 = c1 + brush.colorWeight2;
            if blockHash < c0 {
                colorSeed = 0.5 / COLORS_PER_MATERIAL;
            } else if blockHash < c1 {
                colorSeed = 1.5 / COLORS_PER_MATERIAL;
            } else if blockHash < c2 {
                colorSeed = 2.5 / COLORS_PER_MATERIAL;
            } else {
                colorSeed = 3.5 / COLORS_PER_MATERIAL;
            }
        } else if brush.brushType < 4.5 {
            let proj = coord.x * cos(brush.stripeAngle) + coord.y * sin(brush.stripeAngle);
            colorSeed = hash(vec2f(floor(proj / brush.stripeWidth), 99.17));
        } else {
            // circles: large (12-cell euclidean) or small (5-cell cross) splotches
            let blockCoord = floor(coord / 4.0);
            let sizeHash = hash(blockCoord + vec2f(23.17, 71.31));
            var circleHash: f32;
            var inSplotch: bool;
            if sizeHash < 0.6 {
                // large: euclidean radius ~1.65 in 4x4 grid, center at (2.0, 2.0)
                let center = blockCoord * 4.0 + vec2f(2.0, 2.0);
                inSplotch = distance(coord + vec2f(0.5), center) < 1.65;
                circleHash = hash(blockCoord + vec2f(91.37, 17.73));
            } else {
                // small: manhattan cross in 3x3 grid, center at (1.5, 1.5)
                let smallCoord = floor(coord / 3.0);
                let center = smallCoord * 3.0 + vec2f(1.5, 1.5);
                let dx = abs(coord.x + 0.5 - center.x);
                let dy = abs(coord.y + 0.5 - center.y);
                inSplotch = (dx + dy) < 1.5;
                circleHash = hash(smallCoord + vec2f(91.37, 17.73));
            }
            let cellHash = select(hash(coord + vec2f(37.13, 61.91)), circleHash, inSplotch);
            let c0 = brush.colorWeight0;
            let c1 = c0 + brush.colorWeight1;
            let c2 = c1 + brush.colorWeight2;
            if cellHash < c0 { colorSeed = 0.5 / COLORS_PER_MATERIAL; }
            else if cellHash < c1 { colorSeed = 1.5 / COLORS_PER_MATERIAL; }
            else if cellHash < c2 { colorSeed = 2.5 / COLORS_PER_MATERIAL; }
            else { colorSeed = 3.5 / COLORS_PER_MATERIAL; }
        }
        if isAirMaterial(brush.materialId) {
            textureStore(nextIdentityTexture, vec2i(id.xy), AIR_STATE);
            textureStore(nextPhysicsTexture, vec2i(id.xy), vec4f(0.0));
            textureStore(nextCellStateTexture, vec2i(id.xy), vec4f(0.0));
        } else {
            instantiateCell(vec2i(id.xy), brush.materialId, brush.occupancy, brush.variantId, colorSeed);
        }
    } else {
        textureStore(nextIdentityTexture, vec2i(id.xy), currentState);
        textureStore(nextPhysicsTexture, vec2i(id.xy), currentPhysics);
        textureStore(nextCellStateTexture, vec2i(id.xy), currentCellState);
    }
}
