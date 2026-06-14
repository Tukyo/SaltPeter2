import { writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const root = dirname(fileURLToPath(import.meta.url));
const dir  = join(root, 'src/game/resources/Blueprints/Templates');

// Herringbone Wang tile generator — minimal complete stochastic set (20 tiles).
// Based on: https://nothings.org/gamedev/herringbone/more_herringbone_tiles.html
//
// 4 edge color namespaces:
//
//   A — H.W  / V.E_T / V.E_B  : 1 color  (interface edges — always match)
//   B — H.E  / V.W_T / V.W_B  : 1 color  (interface edges — always match)
//   S — all seam edges          : 2 colors (H.N_L, H.S_L, H.N_R, H.S_R, V.N, V.S)
//
// Merging all seam edges into one group allows cross-row seam matching in the
// alternating type A (V|HH) / type B (HH|V) herringbone layout.
//
// H tiles:  2^4 = 16  (N_L, S_L, N_R, S_R each pick independently from S)
// V tiles:  2^2 =  4  (N and S each pick independently from S)

const A = 'edge_00';
const B = 'edge_01';
const S = ['edge_02', 'edge_03'];

// H tiles — 16 total
const hTiles = [];
for (let nl = 0; nl < 2; nl++) {
    for (let sl = 0; sl < 2; sl++) {
        for (let nr = 0; nr < 2; nr++) {
            for (let sr = 0; sr < 2; sr++) {
                hTiles.push({
                    edges: {
                        N_L: S[nl], S_L: S[sl],
                        N_R: S[nr], S_R: S[sr],
                        W: A, E: B,
                    }
                });
            }
        }
    }
}

// V tiles — 4 total
const vTiles = [];
for (let n = 0; n < 2; n++) {
    for (let s = 0; s < 2; s++) {
        vTiles.push({
            edges: {
                W_T: B, W_B: B,
                E_T: A, E_B: A,
                N: S[n], S: S[s],
            }
        });
    }
}

// Verify completeness
let complete = true;

for (const v of vTiles) {
    const validTopH = hTiles.filter(h => h.edges.W === v.edges.E_T);
    const validBotH = hTiles.filter(h => h.edges.W === v.edges.E_B);
    const stacks = validTopH.filter(t =>
        validBotH.some(b => t.edges.S_L === b.edges.N_L && t.edges.S_R === b.edges.N_R)
    );
    if (stacks.length === 0) {
        console.warn(`FAIL: No H stack for V tile (E_T=${v.edges.E_T}, E_B=${v.edges.E_B})`);
        complete = false;
    }
}

for (const topH of hTiles) {
    for (const botH of hTiles) {
        if (topH.edges.S_L !== botH.edges.N_L || topH.edges.S_R !== botH.edges.N_R) { continue; }
        const vMatch = vTiles.some(v => v.edges.W_T === topH.edges.E && v.edges.W_B === botH.edges.E);
        if (!vMatch) {
            console.warn(`FAIL: No V tile for H stack E=(${topH.edges.E}, ${botH.edges.E})`);
            complete = false;
        }
    }
}

if (complete) { console.log('Complete set verified.'); }
console.log(`H tiles: ${hTiles.length}. V tiles: ${vTiles.length}.`);

// Write files
readdirSync(dir)
    .filter(f => f.endsWith('.blueprint.json') || f.endsWith('.blueprint.meta'))
    .forEach(f => unlinkSync(join(dir, f)));

const makeBlueprint = (name, size, tile) => ({
    name,
    components: [
        {
            enabled: true, type: 'Transform',
            position: { x: 0, y: 0 }, rotation: 0,
            scale: { x: 1, y: 1 }, parentId: null,
        },
        {
            enabled: true, type: 'Blueprint',
            size, edges: tile.edges, cells: [],
        },
    ],
});

const makeMeta = size => JSON.stringify({ guid: randomUUID(), type: 'blueprint', editor: { size } }, null, 2);

for (let i = 0; i < hTiles.length; i++) {
    const name = `Template_Horizontal_${String(i).padStart(2, '0')}`;
    const size = { width: 264, height: 136 };
    writeFileSync(join(dir, `${name}.blueprint.json`), JSON.stringify(makeBlueprint(name, size, hTiles[i]), null, 2));
    writeFileSync(join(dir, `${name}.blueprint.meta`), makeMeta(size));
}

for (let i = 0; i < vTiles.length; i++) {
    const name = `Template_Vertical_${String(i).padStart(2, '0')}`;
    const size = { width: 136, height: 264 };
    writeFileSync(join(dir, `${name}.blueprint.json`), JSON.stringify(makeBlueprint(name, size, vTiles[i]), null, 2));
    writeFileSync(join(dir, `${name}.blueprint.meta`), makeMeta(size));
}

console.log(`Generated ${hTiles.length} H tiles and ${vTiles.length} V tiles.`);
