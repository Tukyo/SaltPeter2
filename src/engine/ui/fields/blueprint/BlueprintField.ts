import type { Blueprint } from '../../../component/definitions/blueprint/Blueprint';
import type { BiomeName } from '../../../world/biome/definitions/BiomeIdentity';

import { BiomeRegistry } from '../../../world/biome/BiomeRegistry';
import { ComponentField } from '../ComponentField';

export class BlueprintField extends ComponentField<Blueprint> {
    public static readonly forType = 'Blueprint';

    protected BuildFields(container: HTMLElement): void {
        container.appendChild(this.ReadOnlyVec2Field(
            'Size', ['W', 'H'],
            String(this.component.size.width),
            String(this.component.size.height),
            'Dimensions of the blueprint texture in cells.'
        ));
        container.appendChild(this.ReadOnlyField(
            'Cells',
            String(this.component.cells.length),
            'Total number of painted cells in the blueprint.'
        ));

        const biomeOptions = Object.keys(BiomeRegistry.Biomes).sort().map(name => ({
            value: name,
            label: name.charAt(0).toUpperCase() + name.slice(1),
        }));
        container.appendChild(this.ToggleListField(
            'Biomes',
            biomeOptions,
            () => this.component.biomes,
            (values) => { this.component.biomes = values as BiomeName[]; },
            'Biomes this blueprint can appear in. If none selected, appears in all biomes.',
        ));
    }
}
