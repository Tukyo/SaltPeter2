# SaltPeter
### A WebGPU pixel simulation game.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)
![WebGPU](https://img.shields.io/badge/WebGPU-005A9C.svg?style=flat-square&logoColor=white)
![WGSL](https://img.shields.io/badge/WGSL-A100FF.svg?style=flat-square&logoColor=white)

---

SaltPeter is a pixel simulation game built on [Nitrate](src/engine/README.md) — a custom WebGPU engine where every cell in the world is simulated in parallel on the GPU. Materials flow, react, burn, freeze, and dissolve with no shortcuts.

Inspired by the cellular automata of [Noita](https://en.wikipedia.org/wiki/Noita_(video_game)) and the open simulation philosophy of [Cortex Command](https://en.wikipedia.org/wiki/Cortex_Command).

## Algorithms & Techniques
One of the main goals in this project is to obtain a better understanding of game-engine subsystems and the processes that provide us as gamers with reliable behaviors during gameplay.

| Concept | Source | Formula |
|---------|--------|---------|
| Cellular Automata | [John Von Neumann](https://en.wikipedia.org/wiki/John_von_Neumann) | $s_{t+1}(x,y) = f(s_t(x,y),\ \mathcal{N}(x,y))$ |
| Chebyshev Distance | [Pafnuty Chebyshev](https://en.wikipedia.org/wiki/Chebyshev_distance) | $d(p,q) = \max(\|p_x - q_x\|,\ \|p_y - q_y\|)$ |
| Lennard-Jones Potential | [John Edward Lennard-Jones](https://en.wikipedia.org/wiki/Lennard-Jones_potential) | $V(r) = 4\varepsilon\left[(\sigma/r)^{12} - (\sigma/r)^{6}\right]$ |
| Graham Scan | [Ronald Graham](https://en.wikipedia.org/wiki/Graham_scan) | $\text{cross}(A,B,C) = (B_x - A_x)(C_y - A_y) - (B_y - A_y)(C_x - A_x)$ |
| Perlin Noise | [Ken Perlin](https://en.wikipedia.org/wiki/Perlin_noise) | $f(t) = 6t^5 - 15t^4 + 10t^3$ |
| Worley Noise | [Steven Worley](https://en.wikipedia.org/wiki/Steven_Worley) | $F_1(\mathbf{x}) = \min_i\ d(\mathbf{x},\ \mathbf{x}_i)$ |
| Ridged Multifractal Noise | [Ken Musgrave](https://en.wikipedia.org/wiki/Ken_Musgrave) | $n_i = 1 - \|f(\mathbf{x} \cdot 2^i)\|$ |
| Dot Product | [Josiah Willard Gibbs](https://en.wikipedia.org/wiki/Dot_product) | $\mathbf{a} \cdot \mathbf{b} = \sum_i a_i b_i = \|\mathbf{a}\|\|\mathbf{b}\|\cos\theta$ |
| Coulomb Friction | [Charles-Augustin de Coulomb](https://en.wikipedia.org/wiki/Friction) | $F_f = \mu N$ |
| Baumgarte Stabilization | [Joachim Baumgarte](https://www.researchgate.net/publication/227225246_Investigation_on_the_Baumgarte_Stabilization_Method_for_Dynamic_Analysis_of_Constrained_Multibody_Systems) | $Jv + \beta \frac{C}{\Delta t} = 0$ |
| Bresenham's Circle | [Jack Elton Bresenham](https://en.wikipedia.org/wiki/Midpoint_circle_algorithm) | $d(x, y) = x^2 + y^2 - r^2$ |
| Thermal conduction | [Joseph Fourier](https://en.wikipedia.org/wiki/Joseph_Fourier) | $q = -k\nabla T$ |


## Engine
Nitrate is the simulation engine powering this project — released separately under CC0, fully public domain.

→ [`src/engine/`](src/engine/README.md)

## Changelog
→ [`CHANGELOG.md`](CHANGELOG.md)

## License
| Scope | License |
|-------|---------|
| Engine (`src/engine/`) | [CC0 1.0 Universal](src/engine/LICENSE) — public domain |
| Game (`src/game/`) | [All Rights Reserved](src/game/LICENSE) |
