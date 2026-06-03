# Nitrate
### A WebGPU Pixel Simulation Engine.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)
![WebGPU](https://img.shields.io/badge/WebGPU-005A9C.svg?style=flat-square&logoColor=white)
![WGSL](https://img.shields.io/badge/WGSL-A100FF.svg?style=flat-square&logoColor=white)

## Overview
Nitrate is a GPU-accelerated pixel simulation engine built on WebGPU. Every cell in the simulation is processed in parallel on the GPU each tick — physics, material identity, state, and diffusion each run as isolated compute passes over ping-pong texture buffers.

The engine is exposed entirely through the `Nitrate` namespace and is designed to be imported into any scene or game layer without modification.

```ts
import { Nitrate } from '@Nitrate';
```

<!-- TABLE_OF_CONTENTS_START -->
## Table of Contents

[`brush/`](brush/README.md)  
[`camera/`](camera/README.md)  
[`component/`](component/README.md)  
[`config/`](config/README.md)  
[`data_persistence/`](data_persistence/README.md)  
[`debug/`](debug/README.md)  
[`definitions/`](definitions/README.md)  
[`game_object/`](game_object/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`export/`](game_object/export/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`import/`](game_object/import/README.md)  
[`input/`](input/README.md)  
[`materials/`](materials/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`definitions/`](materials/definitions/README.md)  
[`particle/`](particle/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`modules/`](particle/modules/README.md)  
[`rendering/`](rendering/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`passes/`](rendering/passes/README.md)  
[`scene/`](scene/README.md)  
[`shaders/`](shaders/README.md)  
[`simulation/`](simulation/README.md)  
[`ui/`](ui/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`controls/`](ui/controls/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`fields/`](ui/fields/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`panels/`](ui/panels/README.md)  
[`utility/`](utility/README.md)  
[`window/`](window/README.md)  
[`world/`](world/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`biome/`](world/biome/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ [`definitions/`](world/biome/definitions/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`chunk/`](world/chunk/README.md)  

<!-- TABLE_OF_CONTENTS_END -->

## License
Nitrate is released under the [CC0 1.0 Universal license](LICENSE) — public domain, no restrictions.

<!-- API_START -->
---

## API

### [`NitrateEngine`](NitrateEngine.ts)
The engine - it provides registry for all engine singletons, de-registry and initialization processing.
Directly responsible for running all of the lifecycle functions.


---

### [`NitrateProcess`](NitrateProcess.ts)
NitrateProcess is the core infastructure for all engine singletons and classes.

This is modeled after Unity's "Monobehavior", providing common lifecycle related functions.

Available Hooks Include: `Start` | `Update` | `BeforeResize` | `OnResize` | `BeforeDestroy` | `OnDestroy`


---

<!-- API_END -->
