<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [Materials](../README.md) / Definitions
<!-- HIERARCHY_END -->

# Definitions

Type contracts and static data for the material simulation. Every material is a single exported `MaterialDefinition` object. The registry auto-discovers all of them via glob — no manual registration needed.

---

## Material Structure

A material definition covers six concerns:

**Identity** — `id` and `name` are both derived from [`MaterialIds`](Materials.ts). Adding a new entry there and creating a definition file in the correct phase folder are both required.

**Appearance** — `colors` is always exactly four RGBA values used for per-cell visual variation. Optional `variants` extend this with named sub-types that carry their own color sets and can override specific physics values.

**Phase** — Determines movement behavior and which `phaseBehavior` key the simulation reads. Each phase exposes high-level tunable parameters that the schema compiles into GPU-ready simulation values.

| Phase | Behavior parameters |
|-------|---------------------|
| ${\color{gray}\textsf{solid}}$ | `activity`, `cohesion` |
| ${\color{goldenrod}\textsf{powder}}$ | `activity`, `mobility`, `flow`, `cohesion` |
| ${\color{royalblue}\textsf{liquid}}$ | `activity`, `flow`, `viscosity`, `turbulence` |
| ${\color{green}\textsf{gas}}$ | `activity`, `rise`, `dissipation`, `turbulence` |
| ${\color{red}\textsf{fire}}$ | `activity`, `mobility`, `dissipation` |

**Physics** — `density` controls displacement priority between materials. `durability` gates burnability and damage resistance. The `temperature` block sets `specificHeat` (thermal conductivity — low conducts fast), `restingTemperature` (spawn temperature and equilibrium target), and `restingStrength` (how aggressively the material returns to that target).

**State** — Initial `health` and an optional `lifetime` that decrements over time using delta time.

**Transitions** — Optional named conditions under which a material converts to another. Five slots: `melts`, `freezes`, `boils`, `condenses`, `breaks`. Each condition checks a `temperature`, `pressure`, or `durability` threshold.

---

## Material Reactions

Reactions are declared globally in [`MaterialReactions`](MaterialReactions.ts) rather than per-material. Each reaction defines two reagents matched by material name or tag, the product materials that replace each reagent cell on contact, and an optional `biproduct` spawned nearby.

`reactionRate` is expressed in approximate seconds but is not exact — the probability formula uses [Chebyshev](https://en.wikipedia.org/wiki/Chebyshev_distance) neighbor offsets, so the effective rate scales with how many reactive neighbors surround a cell. More reactive neighbors means faster conversion.

The optional `neighborMask` restricts which of the 8 surrounding cells are checked using the `NeighborMask` bit flags from [`MaterialReactions`](MaterialReactions.ts). Reactions are registered bidirectionally so `A + B` and `B + A` are equivalent.

<!-- MATERIALS_START -->
## Material List

| ${\color{gray}\textsf{solid}}$ | ${\color{goldenrod}\textsf{powder}}$ | ${\color{royalblue}\textsf{liquid}}$ | ${\color{green}\textsf{gas}}$ | ${\color{red}\textsf{fire}}$ |
|-------|-------|-------|-------|-------|
| Aluminum | Aluminum Powder | Acid | Air | Fire |
| Basalt | Ash | Aluminum Molten | Flammable Gas |  |
| Bone | Bone Powder | Beer | Poison Gas |  |
| Brass | Brass Powder | Blood | Smoke |  |
| Bronze | Bronze Powder | Brass Molten | Steam |  |
| Clay | Coffee Grounds | Brine |  |  |
| Coal | Concrete Powder | Bronze Molten |  |  |
| Concrete | Copper Powder | Caramel |  |  |
| Copper | Dirt | Cement |  |  |
| Diamond | Gold Powder | Coffee |  |  |
| Feces | Grass | Copper Molten |  |  |
| Gold | Gravel | Diarrhea |  |  |
| Ice | Gunpowder | Gold Molten |  |  |
| Iron | Iron Powder | Honey |  |  |
| Lead | Milk Powder | Iron Molten |  |  |
| Meat | Moss | Latte |  |  |
| Meat Burned | Salt | Lava |  |  |
| Meat Cooked | Sand | Lead Molten |  |  |
| Meat Rotten | Sawdust | Milk |  |  |
| Milk Frozen | Silver Powder | Oil |  |  |
| Mud | Snow | Peat |  |  |
| Obsidian | Soil | Plastic Molten |  |  |
| Permafrost | Sugar | Poison |  |  |
| Plastic | Tin Powder | Saltwater |  |  |
| Poison Frozen |  | Silver Molten |  |  |
| Red |  | Steel Molten |  |  |
| Rust |  | Tin Molten |  |  |
| Sandstone |  | Urine |  |  |
| Silver |  | Vomit |  |  |
| Steel |  | Water |  |  |
| Stone |  |  |  |  |
| Terracotta |  |  |  |  |
| Tin |  |  |  |  |
| Wood |  |  |  |  |

<!-- MATERIALS_END -->

<!-- API_START -->
---

## API

### [`MaterialIdentity`](MaterialIdentity.ts)

| Interfaces & Types |
|--------------------|
```ts
type MaterialName = keyof typeof MaterialIds;
```

```ts
type MaterialId = (typeof MaterialIds)[MaterialName];
```

```ts
const OccupancyIds = {
    unoccupied: 0,
    dynamic: 1,
    static: 2
} as const;
```

```ts
type MaterialOccupancy = keyof typeof OccupancyIds;
```

```ts
type OccupancyId = (typeof OccupancyIds)[MaterialOccupancy];
```

---

### [`MaterialModel`](MaterialModel.ts)

| Interfaces & Types |
|--------------------|
```ts
interface MaterialDefinition {
    id: MaterialId;
    name: MaterialName;
    colors: readonly [Color, Color, Color, Color];
    variants?: readonly MaterialVariant[];

    state: MaterialState;

    phase: MaterialPhase;
    phaseBehavior: MaterialPhaseBehavior;

    physics: MaterialPhysics;
    transitions?: MaterialTransitions;
    tags?: readonly MaterialTag[];
}
```

---

### [`MaterialPhases`](MaterialPhases.ts)

| Interfaces & Types |
|--------------------|
```ts
type MaterialPhase = keyof typeof MaterialPhaseIds;
```

```ts
type MaterialPhaseId = (typeof MaterialPhaseIds)[MaterialPhase];
```

```ts
interface MaterialPhaseBehavior {
    solid?: SolidBehavior;
    powder?: PowderBehavior;
    liquid?: LiquidBehavior;
    gas?: GasBehavior;
    fire?: FireBehavior;
}
```

```ts
interface SolidBehavior {
    activity: number;
    cohesion: number;
}
```

```ts
interface PowderBehavior {
    activity: number;
    mobility: number;
    flow: number;
    cohesion: number;
}
```

```ts
interface LiquidBehavior {
    activity: number;
    flow: number;
    viscosity: number;
    turbulence: number;
}
```

```ts
interface GasBehavior {
    activity: number;
    rise: number;
    dissipation: number;
    turbulence: number;
}
```

```ts
interface FireBehavior {
    activity: number;
    mobility: number;
    dissipation: number;
}
```

---

### [`MaterialPhysics`](MaterialPhysics.ts)

| Interfaces & Types |
|--------------------|
```ts
interface MaterialPhysics {
    contact: {
        // Resistance to sliding against other surfaces | 0 = frictionless, 1 = maximum grip
        friction: number;
        // Elasticity on collision | 0 = absorbs impact fully, 1 = returns all energy
        restitution: number;
        // Resistance to penetration | low = soft surface yields before pushing back, high = immediate resistance
        hardness: number;
    }
    // Controls the physical density, allows lighter materials to be pushed aside by denser ones
    density: number;
    // Used for damage resistance
    durability: number;
    // How easily the material burns (material must also be tagged with 'burns' to be flagged as a fuel source)
    flammability?: number;
    temperature: {
        // Resistance to absorbing neighbor temperatures | low = fast conductor, high = slow conductor
        specificHeat: number;
        // Desired temperature for materials (spawns at this temp, tries to return to it)
        restingTemperature: number;
        // How strongly this material tries to return to it's restingTemperature
        restingStrength: number;
    }
}
```

---

### [`MaterialReactions`](MaterialReactions.ts)

| Interfaces & Types |
|--------------------|
```ts
type MaterialReactionProduct = MaterialName | 'self';
```

```ts
interface MaterialReactionReagent {
    materials?: MaterialName[];
    tags?: MaterialTag[];
}
```

```ts
interface MaterialReaction {
    reagents: MaterialReactionReagent[];
    product: MaterialReactionProduct[];
    biproduct?: MaterialName;
    reactionRate: number;
    neighborMask?: number;
}
```

---

### [`MaterialState`](MaterialState.ts)

| Interfaces & Types |
|--------------------|
```ts
interface MaterialState {
    health: number;
    lifetime?: number;
}
```

---

### [`MaterialTags`](MaterialTags.ts)

| Interfaces & Types |
|--------------------|
```ts
const MaterialTags = {
    dev: 0, // Materials tagged with this are for development purposes and not available during gameplay
    burns: 1, // Anything tagged with this will be consumed by fire
    corrodes: 2, // Anything tagged with this will be destroyed by acid
    meat: 3, // Meat variants, currently used to allow substances to rot meat
    rots_meat: 4, // Anything that rots meat
    rustable: 5, // Anything tags with this can rust
    rusts: 6, // Something that causes rust
    extinguishes: 7, // Materials that extinguish fire
    frozen: 8, // Materials that are frozen variants of their solid counterparts
    molten: 9, // Materials that are molten variants of their solid counterparts
} as const;
```

```ts
type MaterialTag = keyof typeof MaterialTags;
```

---

### [`MaterialTransitions`](MaterialTransitions.ts)

| Interfaces & Types |
|--------------------|
```ts
interface MaterialTransition {
    to: MaterialName;
    condition: MaterialTransitionCondition;
}
```

```ts
interface MaterialTransitionCondition {
    temperature?: number;
    pressure?: number;
    durability?: number;
}
```

```ts
interface MaterialTransitions {
    melts?: MaterialTransition
    freezes?: MaterialTransition;
    boils?: MaterialTransition;
    condenses?: MaterialTransition;
    breaks?: MaterialTransition;
}
```

---

### [`MaterialVariants`](MaterialVariants.ts)

| Interfaces & Types |
|--------------------|
```ts
interface MaterialVariant {
    id: number;
    name: string;
    colors: readonly [Color, Color, Color, Color];
    overrides?: MaterialVariantOverrides;
}
```

```ts
interface MaterialVariantOverrides {
    restingTemperature?: number;
    restingStrength?: number;
    specificHeat?: number;
    density?: number;
}
```

---

<!-- API_END -->