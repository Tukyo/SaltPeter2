import { BrushSchema } from '../brush/BrushSchema';
import { PhysicsConfig } from '../config/PhysicsConfig';

import { MaterialPhaseIds } from '../materials/definitions/MaterialPhases';
import { MaterialPhysicsSchema } from '../materials/MaterialPhysicsSchema';
import { MaterialSimulationSchema } from '../materials/MaterialSimulationSchema';
import { MaterialStateSchema } from '../materials/MaterialStateSchema';
import { MaterialVisualSchema } from '../materials/MaterialVisualSchema';
import { MaterialRegistry } from '../materials/MaterialRegistry';
import { MaterialTags } from '../materials/definitions/MaterialTags';

import { SimulationSchema } from '../simulation/SimulationSchema';

/**
 * Generates WGSL source fragments from live TypeScript data.
 *
 * Reads material schemas, config, and registry values to emit WGSL constants,
 * structs, and helpers. Output is concatenated by {@link ShaderAssembler} — not
 * intended for direct use.
 */
export class ShaderFactory {
    //#region GENERAL
    /** Generates all WGSL struct definitions. */
    private static GenerateStruct(
        name: string,
        fields: ReadonlyArray<readonly [string, string]>
    ): string {
        const lines = fields
            .map(([field, type]) => `    ${field}: ${type},`)
            .join('\n');

        return `struct ${name} {\n${lines}\n}`;
    }

    // @omitfromdocs
    public static GenerateMaterialCount(): string {
        const count = Object.keys(MaterialRegistry.Materials).length;
        return `const MATERIAL_COUNT: i32 = ${count};`;
    }

    // @omitfromdocs
    public static GenerateWorkgroupSize(size: number): string {
        return `const WG_SIZE: u32 = ${size}u;`;
    }
    //#endregion

    //#region METADATA
    // @omitfromdocs
    public static GenerateMaterialPhysicsEntryStruct(): string {
        return this.GenerateStruct('MaterialPhysicsEntry', MaterialPhysicsSchema.GetMaterialPhysicsFields());
    }

    // @omitfromdocs
    public static GenerateMaterialStateEntryStruct(): string {
        return this.GenerateStruct('MaterialStateEntry', MaterialStateSchema.GetMaterialStateFields());
    }

    // @omitfromdocs
    public static GenerateMaterialStateIndexHelper(): string {
        return [
            `fn getMaterialStateBase(materialId: f32) -> u32 {`,
            `    return u32(clamp(i32(floor(materialId + 0.5)), 0, MATERIAL_COUNT - 1));`,
            `}`,
        ].join('\n');
    }
    //#endregion

    //#region IDENTITY
    // @omitfromdocs
    public static GenerateVisualEntryStruct(): string {
        const count = MaterialVisualSchema.GetTotalColorsPerMaterial();

        return this.GenerateStruct('VisualEntry', [
            ['colors', `array<vec4f, ${count}>`],
        ]);
    }

    // @omitfromdocs
    public static GenerateColorsPerMaterial(): string {
        return `const COLORS_PER_MATERIAL: f32 = ${MaterialVisualSchema.GetColorsPerMaterial()}.0;`;
    }
    //#endregion

    //#region SIMULATION
    // @omitfromdocs
    public static GenerateIntentConstants(): string {
        return (Object.entries(MaterialSimulationSchema.GetMaterialIntent()) as [string, number][])
            .map(([name, value]) => `const MATERIAL_INTENT_${name}: f32 = ${value};`)
            .join('\n');
    }

    // @omitfromdocs
    public static GenerateIntentUniformStruct(): string {
        return this.GenerateStruct('IntentUniforms', SimulationSchema.GetIntentUniformFields());
    }

    // @omitfromdocs
    public static GenerateSimUniformStruct(): string {
        return this.GenerateStruct('SimUniforms', SimulationSchema.GetSimUniformFields());
    }

    // @omitfromdocs
    public static GenerateSolidSimulationStruct(): string {
        return this.GenerateStruct('SolidSimulation', MaterialSimulationSchema.GetSolidSimulationFields().map(f => [f, 'f32'] as const));
    }

    // @omitfromdocs
    public static GeneratePowderSimulationStruct(): string {
        return this.GenerateStruct('PowderSimulation', MaterialSimulationSchema.GetPowderSimulationFields().map(f => [f, 'f32'] as const));
    }

    // @omitfromdocs
    public static GenerateLiquidSimulationStruct(): string {
        return this.GenerateStruct('LiquidSimulation', MaterialSimulationSchema.GetLiquidSimulationFields().map(f => [f, 'f32'] as const));
    }

    // @omitfromdocs
    public static GenerateGasSimulationStruct(): string {
        return this.GenerateStruct('GasSimulation', MaterialSimulationSchema.GetGasSimulationFields().map(f => [f, 'f32'] as const));
    }

    // @omitfromdocs
    public static GenerateFireSimulationStruct(): string {
        return this.GenerateStruct('FireSimulation', MaterialSimulationSchema.GetFireSimulationFields().map(f => [f, 'f32'] as const));
    }

    // @omitfromdocs
    public static GenerateSimFloatsPerMaterial(): string {
        const max = MaterialSimulationSchema.GetMaxFloatsPerMaterial();
        return [
            `const SIM_FLOATS_PER_MATERIAL: u32 = ${max}u;`,
            `fn getMaterialSimulationBase(materialId: f32) -> u32 {`,
            `    let idx = clamp(i32(floor(materialId + 0.5)), 0, MATERIAL_COUNT - 1);`,
            `    return u32(idx) * SIM_FLOATS_PER_MATERIAL;`,
            `}`,
        ].join('\n');
    }
    //#endregion

    //#region PHASE
    // @omitfromdocs
    public static GenerateMaterialPhaseConstants(): string {
        return (Object.entries(MaterialPhaseIds) as [string, number][])
            .map(([name, value]) => `const MATERIAL_PHASE_${name.toUpperCase()}: f32 = ${value}.0;`)
            .join('\n');
    }

    //#region PHYSICS
    // @omitfromdocs
    public static GeneratePhysicsCellStruct(): string {
        return this.GenerateStruct('PhysicsCell', [
            ['temperature', 'f32']
        ]);
    }

    // @omitfromdocs
    public static GeneratePhysicsConstants(): string {
        const physicsConfig = PhysicsConfig.GetConfig();
        return [
            `const PRESSURE_STEP_SCALE: f32 = ${physicsConfig.pressure.stepScale};`,
            `const PRESSURE_VERTICAL_WEIGHT: f32 = 0.5;`,
            `const PRESSURE_LATERAL_WEIGHT: f32 = 0.25;`,
        ].join('\n');
    }

    // @omitfromdocs
    public static GenerateVelocityConstants(): string {
        const v = PhysicsConfig.GetConfig().velocity;
        return [
            `const MAX_VELOCITY: f32 = ${v.max};`,
            `const VELOCITY_ACCELERATION: f32 = ${v.acceleration};`,
            `const VELOCITY_DAMPING: f32 = ${v.damping};`,
            `const VELOCITY_PROPAGATION: f32 = ${v.propagation};`,
            `fn encodeVelocity(v: f32) -> f32 { return clamp(v, -MAX_VELOCITY, MAX_VELOCITY); }`,
            `fn decodeVelocity(encoded: f32) -> f32 { return encoded; }`,
        ].join('\n');
    }

    // @omitfromdocs
    public static GenerateMaxDensity(): string {
        const max = Math.max(...Object.values(MaterialRegistry.Materials).map(m => m.physics.density));
        return `const MAX_DENSITY: f32 = ${max};`;
    }

    // @omitfromdocs
    public static GeneratePhysicsUniformStruct(): string {
        return this.GenerateStruct('PhysicsUniforms', [
            ['gravity', 'f32']
        ]);
    }

    // @omitfromdocs
    public static GenerateDiffusionUniformStruct(): string {
        return this.GenerateStruct('DiffusionUniforms', [
            ['parity', 'u32'],
            ['gasSwapThreshold', 'f32'],
            ['liquidSwapThreshold', 'f32'],
            ['powderSwapThreshold', 'f32'],
            ['solidSwapThreshold', 'f32'],
            ['gasSwapScale', 'f32'],
            ['liquidSwapScale', 'f32'],
            ['powderSwapScale', 'f32'],
            ['solidSwapScale', 'f32'],
            ['gasResistance', 'f32'],
            ['liquidResistance', 'f32'],
            ['powderResistance', 'f32'],
            ['solidResistance', 'f32'],
            ['liquidDensityScale', 'f32'],
            ['gasDensityScale', 'f32'],
        ]);
    }
    //#endregion

    //#region TAGS
    // @omitfromdocs
    public static GenerateTagConstants(): string {
        const wordsPerMaterial = Math.ceil(Object.keys(MaterialTags).length / 32);
        const tagConsts = (Object.entries(MaterialTags) as [string, number][])
            .map(([name, bit]) => `const TAG_${name.toUpperCase()}: u32 = ${bit}u;`)
            .join('\n');
        return [
            `const TAG_WORDS_PER_MATERIAL: u32 = ${wordsPerMaterial}u;`,
            tagConsts,
        ].join('\n');
    }
    //#endregion

    //#region REACTIONS
    // @omitfromdocs
    public static GenerateReactionConstants(): string {
        return [
            `const REACTION_FLOATS_PER_ENTRY: u32 = 5u;`,
            `fn getReactionBase(idA: f32, idB: f32) -> u32 {`,
            `    let a = u32(clamp(i32(floor(idA + 0.5)), 0, MATERIAL_COUNT - 1));`,
            `    let b = u32(clamp(i32(floor(idB + 0.5)), 0, MATERIAL_COUNT - 1));`,
            `    return (a * u32(MATERIAL_COUNT) + b) * REACTION_FLOATS_PER_ENTRY;`,
            `}`,
        ].join('\n');
    }
    //#endregion

    //#region BRUSH
    // @omitfromdocs
    public static GenerateBrushUniformStruct(): string {
        return this.GenerateStruct('BrushUniforms', BrushSchema.GetBrushUniformFields());
    }

    // @omitfromdocs
    public static GenerateBrushPatternConstants(): string {
        const brushPattern = BrushSchema.GetBrushPattern();

        return [
            `const BRUSH_RANDOM_RATE: f32 = ${brushPattern.randomRate};`,
            `const MATERIAL_PATTERN_BLOB_SCALE: f32 = ${brushPattern.blobScale};`,
            `const MATERIAL_PATTERN_DETAIL_SCALE: f32 = ${brushPattern.detailScale};`,
            `const MATERIAL_PATTERN_BLOB_STRENGTH: f32 = ${brushPattern.blobStrength};`,
            `const MATERIAL_PATTERN_DETAIL_STRENGTH: f32 = ${brushPattern.detailStrength};`,
            `const MATERIAL_PATTERN_GRAIN_STRENGTH: f32 = ${brushPattern.grainStrength};`,
        ].join('\n');
    }
    //#endregion
}
