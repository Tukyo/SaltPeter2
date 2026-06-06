@group(0) @binding(0) var identityTexture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var physicsTexture: texture_storage_2d<rgba32float, read>;
@group(0) @binding(3) var<storage, read> physicsMaterials: array<MaterialPhysicsEntry>;
@group(0) @binding(4) var nextPhysicsTexture: texture_storage_2d<rgba32float, write>;
@group(0) @binding(5) var<uniform> uniforms: DiffusionUniforms;

fn shouldDiffuseSwap(leftCoord: vec2f, rightCoord: vec2f) -> bool {
    let leftState = textureLoad(identityTexture, vec2i(leftCoord));
    let rightState = textureLoad(identityTexture, vec2i(rightCoord));

    if !isOccupiedState(leftState) || !isOccupiedState(rightState) { return false; }
    if isStaticCell(leftState) || isStaticCell(rightState) { return false; }

    let leftMatId = decodeMaterialId(leftState);
    let rightMatId = decodeMaterialId(rightState);
    let leftPhaseId = getMaterialPhaseId(leftMatId);
    let rightPhaseId = getMaterialPhaseId(rightMatId);
    let leftIsLiquid = isMaterialPhaseId(leftPhaseId, MATERIAL_PHASE_LIQUID);
    let rightIsLiquid = isMaterialPhaseId(rightPhaseId, MATERIAL_PHASE_LIQUID);
    let leftIsGas = isMaterialPhaseId(leftPhaseId, MATERIAL_PHASE_GAS);
    let rightIsGas = isMaterialPhaseId(rightPhaseId, MATERIAL_PHASE_GAS);

    if !isDisplaceablePhase(leftPhaseId) || !isDisplaceablePhase(rightPhaseId) { return false; }
    if !leftIsLiquid && !rightIsLiquid && !leftIsGas && !rightIsGas { return false; }
    if leftIsGas != rightIsGas { return false; }

    let bothLiquid = leftIsLiquid && rightIsLiquid;
    let bothGas = leftIsGas && rightIsGas;
    let nonLiquidPhaseId = select(leftPhaseId, rightPhaseId, leftIsLiquid);

    var threshold: f32;
    var scale: f32;
    var resistance: f32;

    if bothLiquid {
        threshold = uniforms.liquidSwapThreshold;
        scale = uniforms.liquidSwapScale;
        resistance = uniforms.liquidResistance;
    } else if isMaterialPhaseId(nonLiquidPhaseId, MATERIAL_PHASE_POWDER) {
        threshold = uniforms.powderSwapThreshold;
        scale = uniforms.powderSwapScale;
        resistance = uniforms.powderResistance;
    } else if isMaterialPhaseId(nonLiquidPhaseId, MATERIAL_PHASE_SOLID) {
        threshold = uniforms.solidSwapThreshold;
        scale = uniforms.solidSwapScale;
        resistance = uniforms.solidResistance;
    } else {
        threshold = uniforms.gasSwapThreshold;
        scale = uniforms.gasSwapScale;
        resistance = uniforms.gasResistance;
    }

    let swapMultiplier = 1.0 - resistance;

    // Pressure-driven: left has higher pressure than right → flow rightward
    let leftPressure = textureLoad(physicsTexture, vec2i(leftCoord)).g;
    let rightPressure = textureLoad(physicsTexture, vec2i(rightCoord)).g;
    let pressureDiff = leftPressure - rightPressure;
    let absDiff = abs(pressureDiff);

    var effectiveDiff = absDiff;
    if bothLiquid {
        let leftDensity = getStateDensity(leftState);
        let rightDensity = getStateDensity(rightState);
        effectiveDiff += abs(leftDensity - rightDensity) * uniforms.liquidDensityScale;
    }
    if bothGas {
        let leftDensity = getStateDensity(leftState);
        let rightDensity = getStateDensity(rightState);
        effectiveDiff += abs(leftDensity - rightDensity) * uniforms.gasDensityScale;
    }

    if effectiveDiff > threshold {
        // TODO: Determine why this is causing liquid duplication
        // When pouring liquids over powder, this causes duplication of the liquid
        let roll = hash(leftCoord + vec2f(leftPressure * 13.7, rightPressure * 7.3));
        if roll < min(effectiveDiff * scale, 0.95) * swapMultiplier { return true; }
    }

    return false;
}

@compute @workgroup_size(WG_SIZE, WG_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let coord = vec2f(f32(gid.x), f32(gid.y));
    let dims = textureDimensions(outputTexture);
    let res = vec2f(f32(dims.x), f32(dims.y));

    if !inBounds(coord, res) { return; }

    let currentState = textureLoad(identityTexture, vec2i(coord));
    let currentPhysics = textureLoad(physicsTexture, vec2i(coord));
    let isLeft = (gid.x + gid.y + uniforms.parity) % 2u == 0u;

    if isLeft {
        let rightCoord = coord + CELL_RIGHT;
        if inBounds(rightCoord, res) && shouldDiffuseSwap(coord, rightCoord) {
            let srcPhysics = textureLoad(physicsTexture, vec2i(rightCoord));
            let newVx = clamp(srcPhysics.b - VELOCITY_ACCELERATION_LIQUID, -MAX_VELOCITY, MAX_VELOCITY);
            textureStore(outputTexture, vec2i(coord), textureLoad(identityTexture, vec2i(rightCoord)));
            textureStore(nextPhysicsTexture, vec2i(coord), vec4f(srcPhysics.r, currentPhysics.g, newVx, srcPhysics.a));
            return;
        }
    } else {
        let leftCoord = coord + CELL_LEFT;
        if inBounds(leftCoord, res) && shouldDiffuseSwap(leftCoord, coord) {
            let srcPhysics = textureLoad(physicsTexture, vec2i(leftCoord));
            let newVx = clamp(srcPhysics.b + VELOCITY_ACCELERATION_LIQUID, -MAX_VELOCITY, MAX_VELOCITY);
            textureStore(outputTexture, vec2i(coord), textureLoad(identityTexture, vec2i(leftCoord)));
            textureStore(nextPhysicsTexture, vec2i(coord), vec4f(srcPhysics.r, currentPhysics.g, newVx, srcPhysics.a));
            return;
        }
    }

    textureStore(outputTexture, vec2i(coord), currentState);
    textureStore(nextPhysicsTexture, vec2i(coord), currentPhysics);
}
