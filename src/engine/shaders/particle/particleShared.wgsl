// Shared particle helpers. Included before all particle pass shaders.
// Requires a `definitions: array<f32>` binding in the enclosing program.

fn calculateSpawn(
    originX: f32,
    originY: f32,
    speed: f32,
    shapeDefBase: i32,
    rng1: f32,
    rng2: f32,
    rng3: f32
) -> vec4f {
    let shapeType = i32(definitions[shapeDefBase + 22] + 0.5);

    var spawnX = originX;
    var spawnY = originY;
    var velX = 0.0;
    var velY = 0.0;

    if shapeType == 1 { // cone
        let coneAngleRadians = definitions[shapeDefBase + 23];
        let dirX = definitions[shapeDefBase + 24];
        let dirY = definitions[shapeDefBase + 25];
        let coneLength = definitions[shapeDefBase + 26];
        let spread = (rng1 - 0.5) * coneAngleRadians;
        let finalAngle = atan2(dirX, dirY) + spread;
        let lengthOffset = rng2 * coneLength;
        spawnX = originX + dirX * lengthOffset;
        spawnY = originY + dirY * lengthOffset;
        velX = speed * sin(finalAngle);
        velY = speed * cos(finalAngle);
    } else if shapeType == 2 { // box
        let boxWidth = definitions[shapeDefBase + 27];
        let boxHeight = definitions[shapeDefBase + 28];
        spawnX = originX + (rng1 - 0.5) * boxWidth;
        spawnY = originY + (rng2 - 0.5) * boxHeight;
        let angle = rng3 * radians(360.0);
        velX = speed * sin(angle);
        velY = speed * cos(angle);
    } else if shapeType == 3 { // circle
        let circleRadius = definitions[shapeDefBase + 29];
        let angle = rng1 * radians(360.0);
        let radius = sqrt(rng2) * circleRadius;
        spawnX = originX + radius * cos(angle);
        spawnY = originY + radius * sin(angle);
        velX = speed * cos(angle);
        velY = speed * sin(angle);
    } else { // no shape — random direction
        let angle = rng1 * radians(360.0);
        velX = speed * sin(angle);
        velY = speed * cos(angle);
    }

    return vec4f(spawnX, spawnY, velX, velY);
}
