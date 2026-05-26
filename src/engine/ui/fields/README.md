<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [Ui](../README.md) / Fields
<!-- HIERARCHY_END -->
# Fields

Inspector field implementations for each component type. When the [`Hierarchy`](../Hierarchy.ts) selects a game object, the [`Inspector`](../Inspector.ts) looks up each attached component by type in [`ComponentFieldRegistry`](ComponentFieldRegistry.ts) and renders the matching field. Each field extends [`ComponentField`](ComponentField.ts), which builds the component section shell — header, icon, enable toggle, remove button — and exposes helpers for building labeled input rows. Subclasses implement `BuildFields` to populate the inputs for their specific component.

<!-- API_START -->
---

## API

### [`ComponentField`](ComponentField.ts)
Abstract base class for all component inspector fields.

Builds the component section shell (header, icon, enable toggle, remove button) and exposes field builder helpers to subclasses.


---

### [`ComponentFieldRegistry`](ComponentFieldRegistry.ts)
 Maps component type strings to their inspector field constructors, built once at module load.


---

<!-- API_END -->