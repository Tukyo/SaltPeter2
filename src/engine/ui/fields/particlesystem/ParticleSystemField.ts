import type { ParticleSystem } from '../../../component/definitions/particlesystem/ParticleSystem';
import type { ParticleDefinition, ParticleModule } from '../../../particle/ParticleModel';
import type { ParticleId } from '../../../particle/ParticleIdentity';
import type { MaterialId } from '../../../materials/definitions/MaterialIdentity';

import { NoiseType } from '../../../utility/Noise';
import { MaterialQuery } from '../../../materials/MaterialQuery';
import { ComponentField } from '../ComponentField';

export class ParticleSystemField extends ComponentField<ParticleSystem> {
    public static readonly forType = 'ParticleSystem';

    protected BuildFields(container: HTMLElement): void {
        const modules = this.component.particle;

        this.BuildMainFields(container, modules);

        container.appendChild(this.ModuleSection(
            'Emission', modules.emission,
            () => { modules.emission = { rate: { time: 10, distance: 0 } }; },
            () => { if (modules.emission) modules.emission.enabled = false; },
            c => this.BuildEmissionFields(c),
        ));
        container.appendChild(this.ModuleSection(
            'Visual', modules.visual,
            () => { modules.visual = { color: { r: 255, g: 255, b: 255, a: 1 } }; },
            () => { if (modules.visual) modules.visual.enabled = false; },
            c => this.BuildVisualFields(c),
        ));
        container.appendChild(this.ModuleSection(
            'Shape', modules.shape,
            () => { modules.shape = { cone: { angle: 25, direction: { x: 0, y: -1 }, length: 1 } }; },
            () => { if (modules.shape) modules.shape.enabled = false; },
            c => this.BuildShapeFields(c),
        ));
        container.appendChild(this.ModuleSection(
            'Velocity Over Lifetime', modules.velocityOverLifetime,
            () => { modules.velocityOverLifetime = { speedMultiplier: 1 }; },
            () => { if (modules.velocityOverLifetime) modules.velocityOverLifetime.enabled = false; },
            c => this.BuildVelocityOverLifetimeFields(c),
        ));
        container.appendChild(this.ModuleSection(
            'Color Over Lifetime', modules.colorOverLifetime,
            () => {
                modules.colorOverLifetime = {
                    start: { r: 255, g: 255, b: 255, a: 1 },
                    end: { r: 255, g: 255, b: 255, a: 0 },
                };
            },
            () => { if (modules.colorOverLifetime) modules.colorOverLifetime.enabled = false; },
            c => this.BuildColorOverLifetimeFields(c),
        ));
        container.appendChild(this.ModuleSection(
            'Noise', modules.noise,
            () => {
                modules.noise = {
                    type: NoiseType.Perlin,
                    octaves: 2,
                    persistence: 0.5,
                    scale: 10,
                    amplitude: 1,
                    scrollSpeed: { x: 0.5, y: 0.5 },
                };
            },
            () => { if (modules.noise) modules.noise.enabled = false; },
            c => this.BuildNoiseFields(c),
        ));
        container.appendChild(this.ModuleSection(
            'Collision', modules.collision,
            () => { modules.collision = { bounce: 0.5, dampen: 0.1, lifetimeLoss: 0, minKillSpeed: 0 }; },
            () => { if (modules.collision) modules.collision.enabled = false; },
            c => this.BuildCollisionFields(c),
        ));
        container.appendChild(this.ModuleSection(
            'Inherit Velocity', modules.inheritVelocity,
            () => { modules.inheritVelocity = { mode: 'Initial', multiplier: 1 }; },
            () => { if (modules.inheritVelocity) modules.inheritVelocity.enabled = false; },
            c => this.BuildInheritVelocityFields(c),
        ));
        container.appendChild(this.ModuleSection(
            'Sub Emitter', modules.subEmitter,
            () => { modules.subEmitter = { spawnCondition: 'Death', particle: 0, probability: 0.5 }; },
            () => { if (modules.subEmitter) modules.subEmitter.enabled = false; },
            c => this.BuildSubEmitterFields(c),
        ));
    }

    private ModuleSection<T extends ParticleModule>(
        label: string,
        module: T | undefined,
        onEnable: () => void,
        onDisable: () => void,
        buildFields: (container: HTMLElement) => void,
    ): HTMLElement {
        const section = document.createElement('div');
        section.className = 'particle-module';

        if (module !== undefined && module.enabled === false) {
            section.classList.add('is-disabled');
        }

        const header = document.createElement('div');
        header.className = 'particle-module-header';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'particle-module-toggle';
        checkbox.checked = module !== undefined && module.enabled !== false;
        checkbox.addEventListener('click', e => e.stopPropagation());

        const title = document.createElement('span');
        title.className = 'particle-module-title';
        title.textContent = label;

        header.appendChild(checkbox);
        header.appendChild(title);

        const content = document.createElement('div');
        content.className = 'particle-module-fields';

        let fieldsBuilt = false;
        const populateIfNeeded = () => {
            if (fieldsBuilt) return;
            buildFields(content);
            fieldsBuilt = true;
        };

        if (module !== undefined) {
            populateIfNeeded();
        } else {
            section.classList.add('is-collapsed');
        }

        header.addEventListener('click', () => {
            if (!fieldsBuilt) {
                checkbox.checked = true;
                onEnable();
                populateIfNeeded();
                section.classList.remove('is-collapsed');
                section.classList.remove('is-disabled');
                return;
            }
            section.classList.toggle('is-collapsed');
        });

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                onEnable();
                populateIfNeeded();
                section.classList.remove('is-collapsed');
                section.classList.remove('is-disabled');
            } else {
                onDisable();
                section.classList.add('is-disabled');
            }
        });

        section.appendChild(header);
        section.appendChild(content);
        return section;
    }

    private BuildMainFields(container: HTMLElement, modules: ParticleDefinition['modules']): void {
        container.appendChild(this.NumberField(
            'Duration',
            modules.main.duration, v => { modules.main.duration = v; },
            'Total duration of the particle system in seconds.'
        ));
        container.appendChild(this.BoolField(
            'Loop',
            modules.main.loop, v => { modules.main.loop = v; },
            'When enabled, the particle system restarts automatically after completing.'
        ));
        container.appendChild(this.NumberField(
            'Gravity',
            modules.main.gravityMultiplier ?? 0, v => { modules.main.gravityMultiplier = v; },
            'Multiplier applied to gravity for all particles in this system.'
        ));
        container.appendChild(this.NumberField(
            'Start Delay',
            modules.main.start.delay ?? 0, v => { modules.main.start.delay = v; },
            'Delay in seconds before the system begins emitting.'
        ));
        container.appendChild(this.NumberRangeField(
            'Lifetime',
            () => modules.main.start.lifetime,
            v => { modules.main.start.lifetime = v; },
            'How long each particle lives in seconds.',
        ));
        container.appendChild(this.NumberRangeField(
            'Speed',
            () => modules.main.start.speed,
            v => { modules.main.start.speed = v; },
            'Initial speed of each particle at birth.',
        ));
    }

    private BuildEmissionFields(container: HTMLElement): void {
        const emission = this.component.particle.emission;
        if (!emission) return;
        container.appendChild(this.NumberField(
            'Rate Over Time',
            emission.rate?.time ?? 0, v => { if (!emission.rate) emission.rate = {}; emission.rate.time = v; },
            'Number of particles emitted per second.'
        ));
        container.appendChild(this.NumberField(
            'Rate Over Distance',
            emission.rate?.distance ?? 0, v => { if (!emission.rate) emission.rate = {}; emission.rate.distance = v; },
            'Number of particles emitted per unit of distance traveled.'
        ));
    }

    private BuildVisualFields(container: HTMLElement): void {
        const visual = this.component.particle.visual;
        if (!visual) return;

        const useMaterial = visual.material !== undefined;

        const sourceRow = document.createElement('div');
        sourceRow.className = 'inspector-field';
        const sourceLbl = document.createElement('label');
        sourceLbl.textContent = 'Source';
        const sourceToggle = document.createElement('div');
        sourceToggle.className = 'particle-source-toggle';
        const colorBtn = document.createElement('button');
        colorBtn.className = `particle-source-btn${!useMaterial ? ' is-active' : ''}`;
        colorBtn.textContent = 'Color';
        const materialBtn = document.createElement('button');
        materialBtn.className = `particle-source-btn${useMaterial ? ' is-active' : ''}`;
        materialBtn.textContent = 'Material';
        sourceToggle.appendChild(colorBtn);
        sourceToggle.appendChild(materialBtn);
        sourceRow.appendChild(sourceLbl);
        sourceRow.appendChild(sourceToggle);
        container.appendChild(sourceRow);

        const colorDiv = document.createElement('div');
        colorDiv.style.display = !useMaterial ? '' : 'none';
        colorDiv.appendChild(this.RandomColorField(
            'Color',
            () => visual.color ?? { r: 255, g: 255, b: 255, a: 1 },
            v => { visual.color = v; visual.material = undefined; },
            'Color of the particle.'
        ));
        container.appendChild(colorDiv);

        const materialDiv = document.createElement('div');
        materialDiv.style.display = useMaterial ? '' : 'none';
        const materialRow = document.createElement('div');
        materialRow.className = 'inspector-field';
        const materialLbl = document.createElement('label');
        materialLbl.textContent = 'Material';
        const materialSelect = document.createElement('select');
        const noneOpt = document.createElement('option');
        noneOpt.value = '-1';
        noneOpt.textContent = '(None)';
        materialSelect.appendChild(noneOpt);
        for (const option of MaterialQuery.GetFilteredOptions({})) {
            const opt = document.createElement('option');
            opt.value = String(option.value);
            opt.textContent = option.label;
            if (option.value === visual.material) opt.selected = true;
            materialSelect.appendChild(opt);
        }
        materialSelect.value = String(visual.material ?? -1);
        materialSelect.addEventListener('change', () => {
            const id = parseInt(materialSelect.value, 10);
            visual.material = id < 0 ? undefined : id as MaterialId;
            visual.color = undefined;
        });
        materialRow.appendChild(materialLbl);
        materialRow.appendChild(materialSelect);
        materialDiv.appendChild(materialRow);
        container.appendChild(materialDiv);

        colorBtn.addEventListener('click', () => {
            colorBtn.classList.add('is-active');
            materialBtn.classList.remove('is-active');
            colorDiv.style.display = '';
            materialDiv.style.display = 'none';
            visual.material = undefined;
        });
        materialBtn.addEventListener('click', () => {
            materialBtn.classList.add('is-active');
            colorBtn.classList.remove('is-active');
            materialDiv.style.display = '';
            colorDiv.style.display = 'none';
            visual.color = undefined;
        });
    }

    private BuildShapeFields(container: HTMLElement): void {
        const shape = this.component.particle.shape;
        if (!shape) return;

        const currentType = shape.cone ? 'Cone' : shape.box ? 'Box' : shape.circle ? 'Circle' : 'None';

        const coneDiv = document.createElement('div');
        coneDiv.style.cssText = 'display:flex;flex-direction:column;gap:5px';

        const boxDiv = document.createElement('div');
        boxDiv.style.cssText = 'display:flex;flex-direction:column;gap:5px';

        const circleDiv = document.createElement('div');
        circleDiv.style.cssText = 'display:flex;flex-direction:column;gap:5px';

        const updateVisibility = (type: string) => {
            coneDiv.style.display = type === 'Cone' ? 'flex' : 'none';
            boxDiv.style.display = type === 'Box' ? 'flex' : 'none';
            circleDiv.style.display = type === 'Circle' ? 'flex' : 'none';
        };

        container.appendChild(this.SelectField(
            'Shape Type', currentType, ['None', 'Cone', 'Box', 'Circle'],
            v => {
                if (v === 'None') { shape.cone = undefined; shape.box = undefined; shape.circle = undefined; }
                else if (v === 'Cone' && !shape.cone) {
                    shape.cone = { angle: 25, direction: { x: 0, y: -1 }, length: 1 };
                } else if (v === 'Box' && !shape.box) {
                    shape.box = { size: { width: 10, height: 10 } };
                } else if (v === 'Circle' && !shape.circle) {
                    shape.circle = { radius: 5 };
                }
                updateVisibility(v);
            },
            'Shape used to emit particles from.',
        ));

        const cone = shape.cone ?? { angle: 25, direction: { x: 0, y: -1 }, length: 1 };
        coneDiv.appendChild(this.NumberField(
            'Angle',
            cone.angle, v => { if (shape.cone) shape.cone.angle = v; },
            'Spread angle of the cone in degrees.'
        ));
        coneDiv.appendChild(this.Vec2Field(
            'Direction',
            cone.direction, v => { if (shape.cone) shape.cone.direction = v; },
            ['X', 'Y'],
            'Direction the cone is facing.'
        ));
        coneDiv.appendChild(this.NumberField(
            'Length',
            cone.length, v => { if (shape.cone) shape.cone.length = v; },
            'Length of the cone emitter.'
        ));
        container.appendChild(coneDiv);

        const box = shape.box ?? { size: { width: 10, height: 10 } };
        boxDiv.appendChild(this.Size2DField(
            'Size',
            box.size, v => { if (shape.box) shape.box.size = v; },
            'Size of the box emitter in cells.'
        ));
        container.appendChild(boxDiv);

        const circle = shape.circle ?? { radius: 5 };
        circleDiv.appendChild(this.NumberField(
            'Radius',
            circle.radius, v => { if (shape.circle) shape.circle.radius = v; },
            'Radius of the circle emitter in cells.'
        ));
        container.appendChild(circleDiv);

        updateVisibility(currentType);
    }

    private BuildVelocityOverLifetimeFields(container: HTMLElement): void {
        const vol = this.component.particle.velocityOverLifetime;
        if (!vol) return;

        container.appendChild(this.NumberField(
            'Speed Multiplier',
            vol.speedMultiplier ?? 1, v => { vol.speedMultiplier = v; },
            'Multiplier applied to particle speed over its lifetime.'
        ));
        container.appendChild(this.RandomStartEndField(
            'Linear X',
            () => vol.linear?.x ?? { start: 0, end: 0 },
            v => { vol.linear = vol.linear ?? {}; vol.linear.x = v; },
            'Velocity applied along the X axis over the particle\'s lifetime.',
        ));
        container.appendChild(this.RandomStartEndField(
            'Linear Y',
            () => vol.linear?.y ?? { start: 0, end: 0 },
            v => { vol.linear = vol.linear ?? {}; vol.linear.y = v; },
            'Velocity applied along the Y axis over the particle\'s lifetime.',
        ));
    }

    private BuildInheritVelocityFields(container: HTMLElement): void {
        const inheritVelocity = this.component.particle.inheritVelocity;
        if (!inheritVelocity) return;
        container.appendChild(this.SelectField(
            'Mode',
            inheritVelocity.mode,
            ['Initial', 'Current'],
            v => { inheritVelocity.mode = v as 'Initial' | 'Current'; },
            'Whether to inherit emitter velocity at birth only or continuously.'
        ));
        container.appendChild(this.NumberField(
            'Multiplier',
            inheritVelocity.multiplier, v => {
                inheritVelocity.multiplier = v;
            }, 'Scale factor applied to the inherited velocity.'
        ));
    }

    private BuildColorOverLifetimeFields(container: HTMLElement): void {
        const colorOverLifetime = this.component.particle.colorOverLifetime;
        if (!colorOverLifetime) return;

        container.appendChild(this.RandomColorField(
            'Start',
            () => colorOverLifetime.start,
            v => { colorOverLifetime.start = v; },
            'Color of the particle at the start of its lifetime.',
        ));
        container.appendChild(this.RandomColorField(
            'End',
            () => colorOverLifetime.end,
            v => { colorOverLifetime.end = v; },
            'Color of the particle at the end of its lifetime.',
        ));
    }

    private BuildNoiseFields(container: HTMLElement): void {
        const noise = this.component.particle.noise;
        if (!noise) return;

        const noiseDisplayNames = {
            [NoiseType.Perlin]: 'Perlin',
            [NoiseType.Ridged]: 'Ridged',
            [NoiseType.Worley]: 'Worley',
            [NoiseType.Voronoi]: 'Voronoi',
            [NoiseType.Hash2D]: 'Hash2D',
        };

        const typeRow = document.createElement('div');
        typeRow.className = 'inspector-field';
        const typeLbl = document.createElement('label');
        typeLbl.textContent = 'Type';
        const typeSelect = document.createElement('select');
        for (const [enumValue, displayName] of Object.entries(noiseDisplayNames)) {
            const opt = document.createElement('option');
            opt.value = enumValue;
            opt.textContent = displayName;
            if (enumValue === noise.type) opt.selected = true;
            typeSelect.appendChild(opt);
        }
        typeSelect.addEventListener('change', () => { noise.type = typeSelect.value as NoiseType; });
        typeRow.appendChild(typeLbl);
        typeRow.appendChild(typeSelect);
        container.appendChild(typeRow);

        container.appendChild(this.NumberField(
            'Octaves',
            noise.octaves, v => { noise.octaves = v; },
            'Number of noise layers stacked for detail.'
        ));
        container.appendChild(this.SliderField(
            'Persistence',
            noise.persistence, 0, 1, 0.01, v => { noise.persistence = v; },
            'How much each octave contributes relative to the previous.'
        ));
        container.appendChild(this.NumberField(
            'Scale',
            noise.scale, v => { noise.scale = v; },
            'Frequency of the noise pattern. Higher values zoom out.'
        ));
        container.appendChild(this.RandomNumberField(
            'Amplitude',
            () => noise.amplitude,
            v => { noise.amplitude = v; },
            'Strength of the noise displacement applied to particle velocity.',
        ));
        container.appendChild(this.RandomVec2Field(
            'Scroll Speed',
            () => noise.scrollSpeed,
            v => { noise.scrollSpeed = v; },
            'Speed at which the noise field scrolls over time.',
        ));
    }

    private BuildCollisionFields(container: HTMLElement): void {
        const collision = this.component.particle.collision;
        if (!collision) return;
        container.appendChild(this.SliderField(
            'Bounce',
            collision.bounce, 0, 1, 0.01, v => { collision.bounce = v; },
            'Elasticity of particle collisions. 0 is no bounce, 1 is full rebound.'
        ));
        container.appendChild(this.SliderField(
            'Dampen',
            collision.dampen, 0, 1, 0.01, v => { collision.dampen = v; },
            'Speed reduction applied on each collision.'
        ));
        container.appendChild(this.SliderField(
            'Lifetime Loss',
            collision.lifetimeLoss, 0, 1, 0.01, v => { collision.lifetimeLoss = v; },
            'Fraction of remaining lifetime lost on each collision.'
        ));
        container.appendChild(this.NumberField(
            'Min Kill Speed',
            collision.minKillSpeed, v => { collision.minKillSpeed = v; },
            'Particles slower than this speed are destroyed on collision.'
        ));
    }

    private BuildSubEmitterFields(container: HTMLElement): void {
        const subEmitter = this.component.particle.subEmitter;
        if (!subEmitter) return;
        container.appendChild(this.SelectField(
            'Condition',
            subEmitter.spawnCondition,
            ['Birth', 'Collision', 'Death'],
            v => { subEmitter.spawnCondition = v as 'Birth' | 'Collision' | 'Death'; },
            'Event that triggers the sub emitter to spawn particles.'
        ));
        // TODO: Unsure what this is - we either need to have MaterialName (like visual module), or ParticleName, or rethink
        // this completely... What if someone wants to emit one of their own created particles? I guess that would be a prefab
        // reference and come much later... We need to think about this!
        container.appendChild(this.NumberField(
            'Particle ID',
            subEmitter.particle, v => { subEmitter.particle = v as ParticleId; },
            'ID of the particle definition used by the sub emitter.'
        ));
        container.appendChild(this.SliderField(
            'Probability',
            subEmitter.probability, 0, 1, 0.01, v => { subEmitter.probability = v; },
            'Chance the sub emitter fires on each trigger event.'
        ));
        container.appendChild(this.SubLabel('Inherit Modules'));

        const moduleLabels: Record<keyof ParticleDefinition['modules'], string> = {
            main: 'Main',
            visual: 'Visual',
            emission: 'Emission',
            shape: 'Shape',
            subEmitter: 'Sub Emitter',
            velocityOverLifetime: 'Velocity Over Lifetime',
            inheritVelocity: 'Inherit Velocity',
            colorOverLifetime: 'Color Over Lifetime',
            noise: 'Noise',
            collision: 'Collision',
        };

        const inheritKeys: Array<keyof ParticleDefinition['modules']> = [
            'main', 'visual', 'emission', 'shape', 'subEmitter',
            'velocityOverLifetime', 'inheritVelocity', 'colorOverLifetime', 'noise', 'collision',
        ];
        for (const key of inheritKeys) {
            const isInherited = subEmitter.inherit?.includes(key) ?? false;
            container.appendChild(this.InlineBoolField(moduleLabels[key], isInherited, checked => {
                if (!subEmitter.inherit) subEmitter.inherit = [];
                if (checked) {
                    if (!subEmitter.inherit.includes(key)) subEmitter.inherit.push(key);
                } else {
                    subEmitter.inherit = subEmitter.inherit.filter(k => k !== key);
                }
            }));
        }
    }
}
