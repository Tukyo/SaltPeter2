/**
 * Declares the ordered field layout for the per-particle-definition GPU buffer.
 *
 * The field list drives both {@link ParticleDefinitionBuffer} (which packs the data) and
 * {@link ShaderFactory} (which emits the matching WGSL struct), so both sides stay in sync
 * from a single source of truth.
 */
export class ParticleSchema {
    private static readonly particleDefinitionFields = [
        // main [0-7]
        ['duration', 'f32'],
        ['loop', 'f32'],
        ['gravity', 'f32'],
        ['startDelay', 'f32'],
        ['lifetimeMin', 'f32'],
        ['lifetimeMax', 'f32'],
        ['speedMin', 'f32'],
        ['speedMax', 'f32'],
        // emission [8-10]
        ['emissionEnabled', 'f32'],
        ['emissionRateTime', 'f32'],
        ['emissionRateDistance', 'f32'],
        // visual [11-20]
        ['visualEnabled', 'f32'],
        ['visualMaterialId', 'f32'],
        ['visualColorFirstR', 'f32'],
        ['visualColorFirstG', 'f32'],
        ['visualColorFirstB', 'f32'],
        ['visualColorFirstA', 'f32'],
        ['visualColorSecondR', 'f32'],
        ['visualColorSecondG', 'f32'],
        ['visualColorSecondB', 'f32'],
        ['visualColorSecondA', 'f32'],
        // shape [21-29]
        ['shapeEnabled', 'f32'],
        ['shapeType', 'f32'],
        ['coneAngleRadians', 'f32'],
        ['coneDirectionX', 'f32'],
        ['coneDirectionY', 'f32'],
        ['coneLength', 'f32'],
        ['boxWidth', 'f32'],
        ['boxHeight', 'f32'],
        ['circleRadius', 'f32'],
        // velocityOverLifetime [30-39]
        ['velocityOverLifetimeEnabled', 'f32'],
        ['volLinearXStartFirst', 'f32'],
        ['volLinearXEndFirst', 'f32'],
        ['volLinearYStartFirst', 'f32'],
        ['volLinearYEndFirst', 'f32'],
        ['volSpeedMultiplier', 'f32'],
        ['volLinearXStartSecond', 'f32'],
        ['volLinearXEndSecond', 'f32'],
        ['volLinearYStartSecond', 'f32'],
        ['volLinearYEndSecond', 'f32'],
        // inheritVelocity [40-42]
        ['inheritVelocityEnabled', 'f32'],
        ['inheritVelocityMode', 'f32'],
        ['inheritVelocityMultiplier', 'f32'],
        // colorOverLifetime [43-59]
        ['colorOverLifetimeEnabled', 'f32'],
        ['colorOverLifetimeStartFirstR', 'f32'],
        ['colorOverLifetimeStartFirstG', 'f32'],
        ['colorOverLifetimeStartFirstB', 'f32'],
        ['colorOverLifetimeStartFirstA', 'f32'],
        ['colorOverLifetimeEndFirstR', 'f32'],
        ['colorOverLifetimeEndFirstG', 'f32'],
        ['colorOverLifetimeEndFirstB', 'f32'],
        ['colorOverLifetimeEndFirstA', 'f32'],
        ['colorOverLifetimeStartSecondR', 'f32'],
        ['colorOverLifetimeStartSecondG', 'f32'],
        ['colorOverLifetimeStartSecondB', 'f32'],
        ['colorOverLifetimeStartSecondA', 'f32'],
        ['colorOverLifetimeEndSecondR', 'f32'],
        ['colorOverLifetimeEndSecondG', 'f32'],
        ['colorOverLifetimeEndSecondB', 'f32'],
        ['colorOverLifetimeEndSecondA', 'f32'],
        // noise [60-70]
        ['noiseEnabled', 'f32'],
        ['noiseType', 'f32'],
        ['noiseOctaves', 'f32'],
        ['noisePersistence', 'f32'],
        ['noiseScale', 'f32'],
        ['noiseAmplitudeFirst', 'f32'],
        ['noiseAmplitudeSecond', 'f32'],
        ['noiseScrollSpeedFirstX', 'f32'],
        ['noiseScrollSpeedFirstY', 'f32'],
        ['noiseScrollSpeedSecondX', 'f32'],
        ['noiseScrollSpeedSecondY', 'f32'],
        // collision [71-75]
        ['collisionEnabled', 'f32'],
        ['collisionBounce', 'f32'],
        ['collisionDampen', 'f32'],
        ['collisionLifetimeLoss', 'f32'],
        ['collisionMinKillSpeed', 'f32'],
        // subEmitter [76-80]
        ['subEmitterEnabled', 'f32'],
        ['subEmitterCondition', 'f32'],
        ['subEmitterParticleId', 'f32'],
        ['subEmitterProbability', 'f32'],
        ['subEmitterInheritMask', 'f32'],
    ] as const satisfies ReadonlyArray<readonly [string, string]>;

    /** Returns the ordered `[name, type]` field pairs that define the particle definition buffer layout. @internal */
    public static GetParticleDefinitionFields() { return ParticleSchema.particleDefinitionFields; }
}
