# Changelog

---

## [0.0.3] - 05/26/2026
### Updates & Changes

### Bug Fixes

---

## [0.0.2] - Patch - 05/26/2026
### Updates & Changes
- Added eyedropper tool to the editor (gameobject mode) — hold ALT to sample any material under the cursor, ALT+click applies the material, brush type, and color variant to the active panels
- Added eyedropper tooltip UI with color swatch, material name, and ID
- Added `SetBrushType` and `SetColorVariant` programmatic methods to `BrushPanel`
- Added `SetActiveMaterialById` programmatic method to `MaterialsPanel`
- Added `MaterialQuery.DecodeColorIndex` as the single source of truth for decoding color seed bytes from the identity texture
- `MaterialQuery` is now exported from the materials index
- `BrushPreview` now reads a live `getBoundingClientRect()` each frame instead of caching a stale rect via `ResizeObserver`
- `RenderingPanel` resolution and scale changes now call `NitrateEngine.Resize` directly instead of going through `WindowManager.ScheduleResize`
- Dev console hidden by default, show with F12
- Added changelog to main readme

### Bug Fixes
- Fixed `BrushPreview` position drifting after canvas resize due to stale cached `DOMRect`
- Fixed `ExportBlueprint` and `ExportGameObject` using inconsistent inline color decoding math — both now use `MaterialQuery.DecodeColorIndex`

---

## [0.0.1] - Initial Release - 05/26/2026
