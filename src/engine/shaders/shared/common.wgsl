struct ResolvedCell {
    identityState: vec4f,
    source:        vec2f,
}

// --- Constants ---

const HASH_SCALE_X:          f32 = 123.34;
const HASH_SCALE_Y:          f32 = 456.21;
const HASH_OFFSET:           f32 = 45.32;
const RANDOM_DECORRELATION:  f32 = 1.61803398875;
const RANDOM_SPLIT_THRESHOLD:f32 = 0.5;
const COORD_MATCH_EPSILON:   f32 = 0.1;
const MATERIAL_ID_SCALE:     f32 = 255.0;
const OCCUPANCY_THRESHOLD:   f32 = 0.5 / 255.0; // > 0 byte = occupied
const OCCUPANCY_DYNAMIC:     f32 = 1.0 / 255.0;
const OCCUPANCY_STATIC:      f32 = 2.0 / 255.0;

const AIR_STATE: vec4f = vec4f(0.0);
const GRAVITY_DEADZONE:      f32 = 0.01;

const CELL_RIGHT:    vec2f = vec2f( 1.0, 0.0);
const CELL_LEFT:     vec2f = vec2f(-1.0, 0.0);
const INVALID_COORD: vec2f = vec2f(-1.0, -1.0);

// --- Hash / Random ---

fn hash(p: vec2f) -> f32 {
    var q = fract(p * vec2f(HASH_SCALE_X, HASH_SCALE_Y));
    q += dot(q, q + HASH_OFFSET);
    return fract(q.x * q.y);
}

fn timeHash(coord: vec2f, time: f32) -> f32 {
    return hash(coord + vec2f(time * 1.6180339887, time * 2.6457513111));
}

fn displacementHash(coord: vec2f, time: f32) -> f32 {
    return hash(coord + vec2f(fract(time * 7.3), fract(time * 11.9)));
}

// --- Coordinate helpers ---

fn inBounds(coord: vec2f, res: vec2f) -> bool {
    return coord.x >= 0.0 &&
           coord.y >= 0.0 &&
           coord.x < res.x &&
           coord.y < res.y;
}

fn isValidCoord(coord: vec2f) -> bool {
    return coord.x >= 0.0 && coord.y >= 0.0;
}

fn sameCoord(a: vec2f, b: vec2f) -> bool {
    return abs(a.x - b.x) < COORD_MATCH_EPSILON &&
           abs(a.y - b.y) < COORD_MATCH_EPSILON;
}

// --- Intent helpers ---

// --- Targeting helpers ---

fn chooseRandomValidTarget(
    firstTarget:       vec2f,
    secondTarget:      vec2f,
    selectorSeed:      f32,
    firstTargetValid:  bool,
    secondTargetValid: bool
) -> vec2f {
    if !firstTargetValid  { return select(INVALID_COORD, secondTarget, secondTargetValid); }
    if !secondTargetValid { return firstTarget; }
    return select(secondTarget, firstTarget, selectorSeed > RANDOM_SPLIT_THRESHOLD);
}

fn chooseWinningClaimant(
    firstSource:  vec2f,
    secondSource: vec2f,
    selectorSeed: f32
) -> vec2f {
    return select(secondSource, firstSource, selectorSeed > RANDOM_SPLIT_THRESHOLD);
}

// --- Material identity encoding ---

fn encodeMaterialId(materialId: f32) -> f32 {
    return materialId / MATERIAL_ID_SCALE;
}

fn decodeMaterialId(identityState: vec4f) -> f32 {
    return floor(identityState.r * MATERIAL_ID_SCALE + 0.5);
}

fn encodeColorSeed(colorSeed: f32) -> f32 {
    return clamp(colorSeed, 0.0, 1.0);
}

fn decodeColorSeed(identityState: vec4f) -> f32 {
    return clamp(identityState.g, 0.0, 1.0);
}

fn encodeVariantId(variantId: f32) -> f32 {
    return variantId / MATERIAL_ID_SCALE;
}

fn decodeVariantId(identityState: vec4f) -> f32 {
    return floor(identityState.b * MATERIAL_ID_SCALE + 0.5);
}

fn isOccupiedState(identityState: vec4f) -> bool {
    return identityState.a > OCCUPANCY_THRESHOLD;
}

fn isStaticCell(identityState: vec4f) -> bool {
    return identityState.a >= OCCUPANCY_STATIC;
}

fn isMaterialState(identityState: vec4f, materialId: f32) -> bool {
    return isOccupiedState(identityState) &&
           abs(decodeMaterialId(identityState) - materialId) < 0.5;
}

fn isValidMaterialId(id: f32) -> bool {
    return id >= 0.0;
}

fn makeMaterialState(materialId: f32, colorSeed: f32, occupancy: f32) -> vec4f {
    return vec4f(
        encodeMaterialId(materialId),
        encodeColorSeed(colorSeed),
        0.0,
        occupancy
    );
}

// Convenience: no color seed (defaults to 0.0)
fn makeMaterialStateSimple(materialId: f32, occupancy: f32) -> vec4f {
    return makeMaterialState(materialId, 0.0, occupancy);
}

// --- Gravity / Time ---

fn getGravityDirection(worldGravity: f32) -> f32 {
    if abs(worldGravity) <= GRAVITY_DEADZONE {
        return 0.0;
    }
    return sign(worldGravity);
}

fn getMaterialStepSeed(time: f32, rate: f32) -> f32 {
    return floor(time * max(rate, 1.0)) % 8.0;
}

// --- Neighbor offsets ---

fn cardinalOffsets() -> array<vec2f, 4> {
    return array<vec2f, 4>(
        vec2f( 0.0,  1.0),
        vec2f( 0.0, -1.0),
        vec2f( 1.0,  0.0),
        vec2f(-1.0,  0.0),
    );
}

fn chebyshevOffsets() -> array<vec2f, 8> {
    return array<vec2f, 8>(
        vec2f( 0.0,  1.0),
        vec2f( 0.0, -1.0),
        vec2f( 1.0,  0.0),
        vec2f(-1.0,  0.0),
        vec2f( 1.0,  1.0),
        vec2f(-1.0,  1.0),
        vec2f( 1.0, -1.0),
        vec2f(-1.0, -1.0),
    );
}
