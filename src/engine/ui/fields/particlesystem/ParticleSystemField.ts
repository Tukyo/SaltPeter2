import type { ParticleSystem } from '../../../component/definitions/particlesystem/ParticleSystem';
import type { ParticleDefinition, ParticleModule } from '../../../particle/ParticleModel';
import type { ParticleId } from '../../../particle/ParticleIdentity';
import type { MaterialId } from '../../../materials/definitions/MaterialIdentity';
import type { Color, NumberRange, RandomBetweenTwo, Vec2 } from '../../../definitions/Primitives';

import { NoiseType } from '../../../utility/Noise';
import { Utils } from '../../../utility/Utils';
import { MaterialQuery } from '../../../materials/MaterialQuery';
import { ColorPickerControl } from '../../controls/ColorPickerControl';
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

    private static IsRandom<T>(value: T | RandomBetweenTwo<T>): boolean {
        return typeof value === 'object' && value !== null && 'first' in (value as object);
    }

    private RandomFieldWrapper(
        label: string,
        isRange: boolean,
        onToggle: (isRange: boolean) => void,
        buildSingle: (container: HTMLElement) => void,
        buildRange: (container: HTMLElement) => void,
    ): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'particle-random-group';

        const header = document.createElement('div');
        header.className = 'particle-random-header';

        const lbl = document.createElement('span');
        lbl.className = 'particle-module-sub-label';
        lbl.textContent = label;

        const modeBtn = document.createElement('button');
        modeBtn.className = `particle-random-mode${isRange ? ' is-active' : ''}`;
        modeBtn.textContent = '±';
        modeBtn.title = isRange ? 'Switch to constant' : 'Switch to random between two';

        header.appendChild(lbl);
        header.appendChild(modeBtn);

        const singleDiv = document.createElement('div');
        singleDiv.className = 'particle-random-single';
        buildSingle(singleDiv);

        const rangeDiv = document.createElement('div');
        rangeDiv.className = 'particle-random-range';
        buildRange(rangeDiv);

        singleDiv.style.display = isRange ? 'none' : '';
        rangeDiv.style.display = isRange ? '' : 'none';

        let current = isRange;
        modeBtn.addEventListener('click', () => {
            current = !current;
            modeBtn.classList.toggle('is-active', current);
            modeBtn.title = current ? 'Switch to constant' : 'Switch to random between two';
            singleDiv.style.display = current ? 'none' : '';
            rangeDiv.style.display = current ? '' : 'none';
            onToggle(current);
        });

        wrapper.appendChild(header);
        wrapper.appendChild(singleDiv);
        wrapper.appendChild(rangeDiv);
        return wrapper;
    }

    private RandomColorField(
        label: string,
        getValue: () => Color | RandomBetweenTwo<Color>,
        onChange: (v: Color | RandomBetweenTwo<Color>) => void,
    ): HTMLElement {
        const [first, second] = Utils.RandomBetweenTwo(getValue());
        return this.RandomFieldWrapper(
            label,
            ParticleSystemField.IsRandom(getValue()),
            (toRange) => {
                const [f] = Utils.RandomBetweenTwo(getValue());
                onChange(toRange ? { first: f, second: f } : f);
            },
            (c) => {
                c.appendChild(new ColorPickerControl(first, v => onChange(v)).element);
            },
            (c) => {
                c.appendChild(this.SubLabel('A'));
                c.appendChild(new ColorPickerControl(first, v => {
                    const [, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: v, second: s });
                }).element);
                c.appendChild(this.SubLabel('B'));
                c.appendChild(new ColorPickerControl(second, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: v });
                }).element);
            },
        );
    }

    private RandomNumberField(
        label: string,
        getValue: () => number | RandomBetweenTwo<number>,
        onChange: (v: number | RandomBetweenTwo<number>) => void,
    ): HTMLElement {
        const [first, second] = Utils.RandomBetweenTwo(getValue());
        return this.RandomFieldWrapper(
            label,
            ParticleSystemField.IsRandom(getValue()),
            (toRange) => {
                const [f] = Utils.RandomBetweenTwo(getValue());
                onChange(toRange ? { first: f, second: f } : f);
            },
            (c) => {
                c.appendChild(this.NumberField('', first, v => onChange(v)));
            },
            (c) => {
                c.appendChild(this.NumberField('A', first, v => {
                    const [, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: v, second: s });
                }));
                c.appendChild(this.NumberField('B', second, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: v });
                }));
            },
        );
    }

    private RandomStartEndField(
        label: string,
        getValue: () => { start: number; end: number } | RandomBetweenTwo<{ start: number; end: number }>,
        onChange: (v: { start: number; end: number } | RandomBetweenTwo<{ start: number; end: number }>) => void,
    ): HTMLElement {
        const [first, second] = Utils.RandomBetweenTwo(getValue());
        return this.RandomFieldWrapper(
            label,
            ParticleSystemField.IsRandom(getValue()),
            (toRange) => {
                const [f] = Utils.RandomBetweenTwo(getValue());
                onChange(toRange ? { first: f, second: f } : f);
            },
            (c) => {
                c.appendChild(this.NumberField('Start', first.start, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ start: v, end: f.end });
                }));
                c.appendChild(this.NumberField('End', first.end, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ start: f.start, end: v });
                }));
            },
            (c) => {
                c.appendChild(this.SubLabel('A'));
                c.appendChild(this.NumberField('Start', first.start, v => {
                    const [f, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: { start: v, end: f.end }, second: s });
                }));
                c.appendChild(this.NumberField('End', first.end, v => {
                    const [f, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: { start: f.start, end: v }, second: s });
                }));
                c.appendChild(this.SubLabel('B'));
                c.appendChild(this.NumberField('Start', second.start, v => {
                    const [f, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: { start: v, end: s.end } });
                }));
                c.appendChild(this.NumberField('End', second.end, v => {
                    const [f, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: { start: s.start, end: v } });
                }));
            },
        );
    }

    private RandomVec2Field(
        label: string,
        getValue: () => Vec2 | RandomBetweenTwo<Vec2>,
        onChange: (v: Vec2 | RandomBetweenTwo<Vec2>) => void,
    ): HTMLElement {
        const [first, second] = Utils.RandomBetweenTwo(getValue());
        return this.RandomFieldWrapper(
            label,
            ParticleSystemField.IsRandom(getValue()),
            (toRange) => {
                const [f] = Utils.RandomBetweenTwo(getValue());
                onChange(toRange ? { first: f, second: f } : f);
            },
            (c) => {
                c.appendChild(this.Vec2Field('', first, v => onChange(v)));
            },
            (c) => {
                c.appendChild(this.Vec2Field('A', first, v => {
                    const [, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: v, second: s });
                }));
                c.appendChild(this.Vec2Field('B', second, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: v });
                }));
            },
        );
    }

    private NumberRangeField(
        label: string,
        getValue: () => number | NumberRange,
        onChange: (v: number | NumberRange) => void,
    ): HTMLElement {
        const value = getValue();
        const isRange = typeof value !== 'number';
        const single = isRange ? value.min : value;
        const rangeMin = isRange ? value.min : value;
        const rangeMax = isRange ? value.max : value;
        return this.RandomFieldWrapper(
            label,
            isRange,
            (toRange) => {
                const current = getValue();
                if (toRange) {
                    const n = typeof current === 'number' ? current : current.min;
                    onChange({ min: n, max: n });
                } else {
                    onChange(typeof current === 'number' ? current : current.min);
                }
            },
            (c) => {
                c.appendChild(this.NumberField('', single, v => onChange(v)));
            },
            (c) => {
                c.appendChild(this.NumberField('Min', rangeMin, v => {
                    const current = getValue();
                    const max = typeof current === 'number' ? current : current.max;
                    onChange({ min: v, max });
                }));
                c.appendChild(this.NumberField('Max', rangeMax, v => {
                    const current = getValue();
                    const min = typeof current === 'number' ? current : current.min;
                    onChange({ min, max: v });
                }));
            },
        );
    }

    private SubLabel(text: string): HTMLElement {
        const el = document.createElement('div');
        el.className = 'particle-module-sub-label';
        el.textContent = text;
        return el;
    }

    private InlineBoolField(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
        const row = document.createElement('div');
        row.className = 'particle-inline-bool';
        const lbl = document.createElement('span');
        lbl.className = 'particle-inline-bool-label';
        lbl.textContent = label;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        checkbox.addEventListener('change', () => onChange(checkbox.checked));
        row.appendChild(lbl);
        row.appendChild(checkbox);
        return row;
    }

    private BuildMainFields(container: HTMLElement, modules: ParticleDefinition['modules']): void {
        container.appendChild(this.NumberField('Duration', modules.main.duration, v => {
            modules.main.duration = v;
        }));
        container.appendChild(this.BoolField('Loop', modules.main.loop, v => {
            modules.main.loop = v;
        }));
        container.appendChild(this.NumberField('Gravity', modules.main.gravityMultiplier ?? 0, v => {
            modules.main.gravityMultiplier = v;
        }));
        container.appendChild(this.NumberField('Start Delay', modules.main.start.delay ?? 0, v => {
            modules.main.start.delay = v;
        }));
        container.appendChild(this.NumberRangeField(
            'Lifetime',
            () => modules.main.start.lifetime,
            v => { modules.main.start.lifetime = v; },
        ));
        container.appendChild(this.NumberRangeField(
            'Speed',
            () => modules.main.start.speed,
            v => { modules.main.start.speed = v; },
        ));
    }

    private BuildEmissionFields(container: HTMLElement): void {
        const emission = this.component.particle.emission;
        if (!emission) return;
        container.appendChild(this.NumberField('Rate Over Time', emission.rate?.time ?? 0, v => {
            if (!emission.rate) emission.rate = {};
            emission.rate.time = v;
        }));
        container.appendChild(this.NumberField('Rate Over Distance', emission.rate?.distance ?? 0, v => {
            if (!emission.rate) emission.rate = {};
            emission.rate.distance = v;
        }));
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
        ));

        const cone = shape.cone ?? { angle: 25, direction: { x: 0, y: -1 }, length: 1 };
        coneDiv.appendChild(this.NumberField('Angle', cone.angle, v => { if (shape.cone) shape.cone.angle = v; }));
        coneDiv.appendChild(this.Vec2Field('Direction', cone.direction, v => { if (shape.cone) shape.cone.direction = v; }));
        coneDiv.appendChild(this.NumberField('Length', cone.length, v => { if (shape.cone) shape.cone.length = v; }));
        container.appendChild(coneDiv);

        const box = shape.box ?? { size: { width: 10, height: 10 } };
        boxDiv.appendChild(this.Size2DField('Size', box.size, v => { if (shape.box) shape.box.size = v; }));
        container.appendChild(boxDiv);

        const circle = shape.circle ?? { radius: 5 };
        circleDiv.appendChild(this.NumberField('Radius', circle.radius, v => { if (shape.circle) shape.circle.radius = v; }));
        container.appendChild(circleDiv);

        updateVisibility(currentType);
    }

    private BuildVelocityOverLifetimeFields(container: HTMLElement): void {
        const vol = this.component.particle.velocityOverLifetime;
        if (!vol) return;

        container.appendChild(this.NumberField('Speed Multiplier', vol.speedMultiplier ?? 1, v => {
            vol.speedMultiplier = v;
        }));
        container.appendChild(this.RandomStartEndField(
            'Linear X',
            () => vol.linear?.x ?? { start: 0, end: 0 },
            v => { vol.linear = vol.linear ?? {}; vol.linear.x = v; },
        ));
        container.appendChild(this.RandomStartEndField(
            'Linear Y',
            () => vol.linear?.y ?? { start: 0, end: 0 },
            v => { vol.linear = vol.linear ?? {}; vol.linear.y = v; },
        ));
    }

    private BuildInheritVelocityFields(container: HTMLElement): void {
        const inheritVelocity = this.component.particle.inheritVelocity;
        if (!inheritVelocity) return;
        container.appendChild(this.SelectField('Mode', inheritVelocity.mode, ['Initial', 'Current'], v => {
            inheritVelocity.mode = v as 'Initial' | 'Current';
        }));
        container.appendChild(this.NumberField('Multiplier', inheritVelocity.multiplier, v => {
            inheritVelocity.multiplier = v;
        }));
    }

    private BuildColorOverLifetimeFields(container: HTMLElement): void {
        const colorOverLifetime = this.component.particle.colorOverLifetime;
        if (!colorOverLifetime) return;
        container.appendChild(this.RandomColorField(
            'Start',
            () => colorOverLifetime.start,
            v => { colorOverLifetime.start = v; },
        ));
        container.appendChild(this.RandomColorField(
            'End',
            () => colorOverLifetime.end,
            v => { colorOverLifetime.end = v; },
        ));
    }

    private BuildNoiseFields(container: HTMLElement): void {
        const noise = this.component.particle.noise;
        if (!noise) return;

        const noiseDisplayNames: Record<NoiseType, string> = {
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

        container.appendChild(this.NumberField('Octaves', noise.octaves, v => { noise.octaves = v; }));
        container.appendChild(this.SliderField('Persistence', noise.persistence, 0, 1, 0.01, v => {
            noise.persistence = v;
        }));
        container.appendChild(this.NumberField('Scale', noise.scale, v => { noise.scale = v; }));
        container.appendChild(this.RandomNumberField(
            'Amplitude',
            () => noise.amplitude,
            v => { noise.amplitude = v; },
        ));
        container.appendChild(this.RandomVec2Field(
            'Scroll Speed',
            () => noise.scrollSpeed,
            v => { noise.scrollSpeed = v; },
        ));
    }

    private BuildCollisionFields(container: HTMLElement): void {
        const collision = this.component.particle.collision;
        if (!collision) return;
        container.appendChild(this.SliderField('Bounce', collision.bounce, 0, 1, 0.01, v => {
            collision.bounce = v;
        }));
        container.appendChild(this.SliderField('Dampen', collision.dampen, 0, 1, 0.01, v => {
            collision.dampen = v;
        }));
        container.appendChild(this.SliderField('Lifetime Loss', collision.lifetimeLoss, 0, 1, 0.01, v => {
            collision.lifetimeLoss = v;
        }));
        container.appendChild(this.NumberField('Min Kill Speed', collision.minKillSpeed, v => {
            collision.minKillSpeed = v;
        }));
    }

    private BuildSubEmitterFields(container: HTMLElement): void {
        const subEmitter = this.component.particle.subEmitter;
        if (!subEmitter) return;
        container.appendChild(this.SelectField(
            'Condition', subEmitter.spawnCondition, ['Birth', 'Collision', 'Death'],
            v => { subEmitter.spawnCondition = v as 'Birth' | 'Collision' | 'Death'; },
        ));
        container.appendChild(this.NumberField('Particle ID', subEmitter.particle, v => {
            subEmitter.particle = v as ParticleId;
        }));
        container.appendChild(this.SliderField('Probability', subEmitter.probability, 0, 1, 0.01, v => {
            subEmitter.probability = v;
        }));
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
