fn sampleNeighborTemp(neighborCoord: vec2i, imax: vec2i) -> f32 {
    let nc          = clamp(neighborCoord, vec2i(0), imax);
    let simOccupied = isOccupiedState(textureLoad(identityTexture,      nc));
    let goOccupied  = isOccupiedState(textureLoad(crossIdentityTexture, nc));
    let simTemp     = textureLoad(physicsTexture,      nc).r;
    let goTemp      = textureLoad(crossPhysicsTexture, nc).r;
    if simOccupied && goOccupied { return (simTemp + goTemp) * 0.5; }
    if goOccupied  { return goTemp; }
    return simTemp;
}

fn propagateTemperature(coord: vec2f, res: vec2f) -> f32 {
    let cell          = textureLoad(physicsTexture,  vec2i(coord));
    let identityState = textureLoad(identityTexture, vec2i(coord));
    let currentTemp   = cell.r;

    let matIdx       = clamp(i32(floor(decodeMaterialId(identityState) + 0.5)), 0, MATERIAL_COUNT - 1);
    let mat          = physicsMaterials[matIdx];
    let conductivity = min(1.0 / max(mat.specificHeat, 0.001), 1.0);

    let icoord = vec2i(coord);
    let imax   = vec2i(i32(res.x) - 1, i32(res.y) - 1);

    let tUp    = sampleNeighborTemp(icoord + vec2i( 0,  1), imax);
    let tDown  = sampleNeighborTemp(icoord + vec2i( 0, -1), imax);
    let tLeft  = sampleNeighborTemp(icoord + vec2i(-1,  0), imax);
    let tRight = sampleNeighborTemp(icoord + vec2i( 1,  0), imax);

    let neighborAvg = (tUp + tDown + tLeft + tRight) / 4.0;
    var newTemp     = mix(currentTemp, neighborAvg, conductivity);

    let deviation   = max(abs(mat.restingTemperature - physicsMaterials[0].restingTemperature), 0.05);
    let restingPull = min(deviation * mat.restingStrength / max(mat.specificHeat, 0.001), 1.0);
    newTemp = mix(newTemp, mat.restingTemperature, restingPull);

    return newTemp;
}
