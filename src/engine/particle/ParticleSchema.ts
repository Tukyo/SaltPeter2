/**
 * Declares the ordered field layout for the per-particle-definition GPU buffer.
 *
 * The field list drives both {@link ParticleDefinitionBuffer} (which packs the data) and
 * {@link ShaderFactory} (which emits the matching WGSL struct), so both sides stay in sync
 * from a single source of truth.
 */
export class ParticleSchema {
    private static readonly particleDefinitionFields = [
        ['emissionRate', 'f32'], // Particles spawned per second
        ['lifetimeMin', 'f32'], // Minimum particle lifetime in seconds
        ['lifetimeMax', 'f32'], // Maximum particle lifetime in seconds
        ['speedMin', 'f32'], // Minimum initial speed
        ['speedMax', 'f32'], // Maximum initial speed
        ['loop', 'f32'], // 1 = looping, 0 = one-shot
        ['duration', 'f32'], // How long the system runs in seconds
        ['visualMaterialId', 'f32'], // Material ID to source color from, -1 if using raw color
        ['visualColorR', 'f32'], // Raw color R (0-1), used when visualMaterialId is -1
        ['visualColorG', 'f32'], // Raw color G (0-1)
        ['visualColorB', 'f32'], // Raw color B (0-1)
        ['visualColorA', 'f32'], // Raw color A (0-1)
        ['gravity', 'f32'], // Acceleration applied to velY per second
        ['coneAngleRadians', 'f32'], // Cone half-angle in radians
        ['directionX', 'f32'], // Normalized emission direction X
        ['directionY', 'f32'], // Normalized emission direction Y
        ['volLinearXStart', 'f32'], // VelocityOverLifetime linear X at birth
        ['volLinearXEnd', 'f32'], // VelocityOverLifetime linear X at death
        ['volLinearYStart', 'f32'], // VelocityOverLifetime linear Y at birth
        ['volLinearYEnd', 'f32'], // VelocityOverLifetime linear Y at death
        ['volSpeedMultiplier', 'f32'], // VelocityOverLifetime speed scale (1 = no change)
        ['startDelay', 'f32'], // Delay before first emission in seconds
        ['emissionRateDistance', 'f32'], // Particles spawned per unit of distance moved
        ['shapeType', 'f32'], // Active shape: 0=none, 1=cone, 2=box, 3=circle
        ['coneLength', 'f32'], // Cone length
        ['boxWidth', 'f32'], // Box emitter width
        ['boxHeight', 'f32'], // Box emitter height
        ['circleRadius', 'f32'], // Circle emitter radius
        ['noiseEnabled', 'f32'], // 1 if noise module is active, 0 otherwise
        ['noiseType', 'f32'], // Noise algorithm (matches NoiseType enum)
        ['noiseOctaves', 'f32'], // Noise octave count
        ['noisePersistence', 'f32'], // Noise persistence
        ['noiseScale', 'f32'], // Noise scale
        ['noiseAmplitude', 'f32'], // Noise amplitude
        ['colorOverLifetimeEnabled', 'f32'], // 1 if colorOverLifetime module is active, 0 otherwise
        ['colorOverLifetimeStartR', 'f32'], // Start color R (0-1)
        ['colorOverLifetimeStartG', 'f32'], // Start color G (0-1)
        ['colorOverLifetimeStartB', 'f32'], // Start color B (0-1)
        ['colorOverLifetimeStartA', 'f32'], // Start color A (0-1)
        ['colorOverLifetimeEndR', 'f32'], // End color R (0-1)
        ['colorOverLifetimeEndG', 'f32'], // End color G (0-1)
        ['colorOverLifetimeEndB', 'f32'], // End color B (0-1)
        ['colorOverLifetimeEndA', 'f32'], // End color A (0-1)
        ['collisionEnabled', 'f32'], // 1 if collision module is active, 0 otherwise
        ['collisionBounce', 'f32'], // Velocity reflection factor (0 = absorb, 1 = perfect reflect)
        ['collisionDampen', 'f32'], // Fraction of velocity removed after bounce (0 = full retain, 1 = full absorb)
        ['collisionLifetimeLoss', 'f32'], // Fraction of maxLifetime removed per collision
        ['collisionMinKillSpeed', 'f32'], // Kill particle if post-collision speed drops below this
        ['noiseScrollSpeedX', 'f32'], // Noise field scroll speed along X per second
        ['noiseScrollSpeedY', 'f32'], // Noise field scroll speed along Y per second
    ] as const satisfies ReadonlyArray<readonly [string, string]>;

    /** Returns the ordered `[name, type]` field pairs that define the particle definition buffer layout. @internal */
    public static GetParticleDefinitionFields() { return ParticleSchema.particleDefinitionFields; }
}
