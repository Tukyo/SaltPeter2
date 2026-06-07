import type { Color } from '../../definitions/Primitives';

export class ColorPickerControl {
    public readonly element: HTMLElement;

    private readonly colorInput: HTMLInputElement;
    private readonly alphaSlider: HTMLInputElement;
    private readonly alphaReadout: HTMLSpanElement;

    constructor(initial: Color, onChange: (color: Color) => void) {
        this.element = document.createElement('div');
        this.element.className = 'color-picker-control';

        this.colorInput = document.createElement('input');
        this.colorInput.type = 'color';
        this.colorInput.className = 'color-picker-swatch';
        this.colorInput.value = ColorPickerControl.ToHex(initial);

        const alphaRow = document.createElement('div');
        alphaRow.className = 'color-picker-alpha-row';

        const alphaLabel = document.createElement('span');
        alphaLabel.className = 'color-picker-alpha-label';
        alphaLabel.textContent = 'A';

        this.alphaSlider = document.createElement('input');
        this.alphaSlider.type = 'range';
        this.alphaSlider.className = 'color-picker-alpha-slider';
        this.alphaSlider.min = '0';
        this.alphaSlider.max = '1';
        this.alphaSlider.step = '0.01';
        this.alphaSlider.value = String(initial.a);
        this.alphaSlider.style.setProperty('--value', `${initial.a * 100}%`);

        this.alphaReadout = document.createElement('span');
        this.alphaReadout.className = 'color-picker-alpha-readout';
        this.alphaReadout.textContent = initial.a.toFixed(2);

        const fireChange = () => {
            const rgb = ColorPickerControl.FromHex(this.colorInput.value);
            const alpha = parseFloat(this.alphaSlider.value);
            this.alphaSlider.style.setProperty('--value', `${alpha * 100}%`);
            this.alphaReadout.textContent = alpha.toFixed(2);
            onChange({ ...rgb, a: alpha });
        };

        this.colorInput.addEventListener('input', fireChange);
        this.alphaSlider.addEventListener('input', fireChange);

        alphaRow.appendChild(alphaLabel);
        alphaRow.appendChild(this.alphaSlider);
        alphaRow.appendChild(this.alphaReadout);

        this.element.appendChild(this.colorInput);
        this.element.appendChild(alphaRow);
    }

    /** Sets the color value in the ColorPicker. */
    public SetColor(color: Color): void {
        this.colorInput.value = ColorPickerControl.ToHex(color);
        this.alphaSlider.value = String(color.a);
        this.alphaSlider.style.setProperty('--value', `${color.a * 100}%`);
        this.alphaReadout.textContent = color.a.toFixed(2);
    }

    private static ToHex(c: Color): string {
        const clamp = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
        return `#${[c.r, c.g, c.b].map(v => clamp(v).toString(16).padStart(2, '0')).join('')}`;
    }

    private static FromHex(hex: string): Pick<Color, 'r' | 'g' | 'b'> {
        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16),
        };
    }
}
