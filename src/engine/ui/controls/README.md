<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [Ui](../README.md) / Controls
<!-- HIERARCHY_END -->
# Controls

Control handler implementations for the UI registry. Each control handles a specific [`UISetting`](../UserInterfaceTypes.ts) type — building the DOM element, binding events, and reading the current value. Controls register themselves at startup via [`UserInterfaceRegistry`](../UserInterfaceRegistry.ts) and are used internally by panels.

<!-- API_START -->
---

## API

### [`ActionGroupControl`](ActionGroupControl.ts)
 Control handler for `ActionGroupSetting`. Renders a row of icon buttons that fire action callbacks.


---

### [`ButtonControl`](ButtonControl.ts)
 Control handler for `ButtonSetting`. Renders a single labeled action button.


---

### [`ChoiceControl`](ChoiceControl.ts)
 Control handler for `ChoiceSetting`. Renders a segmented button group with single selection.


---

### [`ColorPickerControl`](ColorPickerControl.ts)

| Method | Description |
|--------|-------------|
| [`SetColor(color: Color): void`](ColorPickerControl.ts) | Sets the color value in the ColorPicker. |

---

### [`PaletteControl`](PalletteControl.ts)
 Control handler for `PaletteSetting`. Renders a row of color swatches with single selection.


---

### [`RangeControl`](RangeControl.ts)
 Control handler for `RangeSetting`. Renders a labeled slider with optional readout.


---

### [`SelectControl`](SelectControl.ts)
 Control handler for `SelectSetting`. Renders a labeled dropdown.


---

### [`TextControl`](TextControl.ts)
 Control handler for `TextSetting`. Renders a labeled text input.


---

### [`ToggleGroupControl`](ToggleGroupControl.ts)
 Control handler for `ToggleGroupSetting`. Renders a segmented button group with multi-selection.


---

### [`ToggleListControl`](ToggleListControl.ts)
 Control handler for `ToggleListSetting`. Renders a scrollable vertical list of toggle rows with multi-selection.


---

<!-- API_END -->