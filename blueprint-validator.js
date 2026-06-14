import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const dir = join(root, 'src/game/resources/Blueprints/Templates');

const blueprints = readdirSync(dir)
    .filter(f => f.endsWith('.blueprint.json'))
    .map(f => {
        const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
        const bp = data.components.find(c => c.type === 'Blueprint');
        return { name: data.name, e: bp.edges, isV: bp.size.width < bp.size.height };
    });

const h = blueprints.filter(t => !t.isV);
const v = blueprints.filter(t => t.isV);

// Match rule helpers
const hStackValid    = (t, b) => t.e.S_L === b.e.N_L && t.e.S_R === b.e.N_R;
const vRightFitsH    = (vt, topH, botH) => vt.e.E_T === topH.e.W && vt.e.E_B === botH.e.W;
const hStackFitsVLeft = (topH, botH, vt) => topH.e.E === vt.e.W_T && botH.e.E === vt.e.W_B;
const vStacksAbove   = (upper, lower) => upper.e.S === lower.e.N;

// Color swatches — 8 colors used by the minimal 20-tile set
const EDGE_COLORS = {
    edge_00: 'rgb(20,60,255)',     // Group A — W interface
    edge_01: 'rgb(20,210,40)',     // Group B — E interface
    edge_02: 'rgb(150,20,230)',    // Group C — seam left 0
    edge_03: 'rgb(240,20,20)',     // Group C — seam left 1
};

const swatch = name => {
    const bg = EDGE_COLORS[name] ?? '#888';
    return `<span title="${name}" style="display:inline-block;width:12px;height:12px;` +
        `background:${bg};border:1px solid rgba(0,0,0,0.5);border-radius:2px;vertical-align:middle"></span>`;
};

const edgeCell = (tile, key) => {
    const val = tile.e[key];
    return val ? `${key} ${swatch(val)}` : `${key} —`;
};

const lines = [];
const log = s => lines.push(s ?? '');

log('# Blueprint Validation');
log();
log(`**H tiles:** ${h.length} &nbsp; **V tiles:** ${v.length} &nbsp; **Total:** ${blueprints.length}`);
log();

// ── 1. Tile Edge Tables ───────────────────────────────────────────────────────
log('## 1. Tile Edges');
log();

for (const t of h) {
    const rightPairs = [];
    const leftPairs = [];
    for (const topH of h) {
        for (const botH of h) {
            if (!hStackValid(topH, botH)) { continue; }
            if (vRightFitsH({ e: { E_T: t.e.W, E_B: t.e.W } }, topH, botH)) {
                // This h tile's W edge matches as topH or botH in a stack — but that's V logic
            }
        }
    }
    // For H tiles, matches are: same-group tiles can stack; and V tiles that use this H's W or E
    const stacksAbove = h.filter(x => x !== t && hStackValid(x, t));
    const stacksBelow = h.filter(x => x !== t && hStackValid(t, x));
    const vRight = v.filter(vt => vt.e.E_T === t.e.W || vt.e.E_B === t.e.W);
    const vLeft  = v.filter(vt => vt.e.W_T === t.e.E || vt.e.W_B === t.e.E);

    log(`### ${t.name}`);
    log();
    log('| Edge | Value |');
    log('|------|-------|');
    log(`| N_L | ${edgeCell(t, 'N_L')} |`);
    log(`| N_R | ${edgeCell(t, 'N_R')} |`);
    log(`| S_L | ${edgeCell(t, 'S_L')} |`);
    log(`| S_R | ${edgeCell(t, 'S_R')} |`);
    log(`| W   | ${edgeCell(t, 'W')} |`);
    log(`| E   | ${edgeCell(t, 'E')} |`);
    log();
    log(`**Can stack above:** ${stacksAbove.length > 0 ? stacksAbove.map(x => x.name).join(', ') : '*(none)*'}`);
    log();
    log(`**Can stack below:** ${stacksBelow.length > 0 ? stacksBelow.map(x => x.name).join(', ') : '*(none)*'}`);
    log();
    log(`**V tiles that connect on left (V.E_T or E_B == this.W):** ${vRight.length > 0 ? vRight.map(x => x.name).join(', ') : '*(none)*'}`);
    log();
    log(`**V tiles that follow on right (V.W_T or W_B == this.E):** ${vLeft.length > 0 ? vLeft.map(x => x.name).join(', ') : '*(none)*'}`);
    log();
}

for (const t of v) {
    const rightStacks = [];
    const leftStacks = [];
    for (const topH of h) {
        for (const botH of h) {
            if (!hStackValid(topH, botH)) { continue; }
            if (vRightFitsH(t, topH, botH)) {
                rightStacks.push(`${topH.name} + ${botH.name}`);
            }
            if (hStackFitsVLeft(topH, botH, t)) {
                leftStacks.push(`${topH.name} + ${botH.name}`);
            }
        }
    }
    const above = v.filter(x => x !== t && vStacksAbove(x, t));
    const below = v.filter(x => x !== t && vStacksAbove(t, x));

    log(`### ${t.name}`);
    log();
    log('| Edge | Value |');
    log('|------|-------|');
    log(`| W_T | ${edgeCell(t, 'W_T')} |`);
    log(`| W_B | ${edgeCell(t, 'W_B')} |`);
    log(`| E_T | ${edgeCell(t, 'E_T')} |`);
    log(`| E_B | ${edgeCell(t, 'E_B')} |`);
    log(`| N   | ${edgeCell(t, 'N')} |`);
    log(`| S   | ${edgeCell(t, 'S')} |`);
    log();
    log(`**H stacks on right (V.E_T/E_B → topH.W/botH.W):** ${rightStacks.length > 0 ? rightStacks.join(', ') : '*(none)*'}`);
    log();
    log(`**H stacks on left (topH.E/botH.E → V.W_T/W_B):** ${leftStacks.length > 0 ? leftStacks.join(', ') : '*(none)*'}`);
    log();
    log(`**V above (this.S == upper.N):** ${above.length > 0 ? above.map(x => x.name).join(', ') : '*(none)*'}`);
    log();
    log(`**V below (this.N == lower.S):** ${below.length > 0 ? below.map(x => x.name).join(', ') : '*(none)*'}`);
    log();
}

// ── 2. Complete Set Check ─────────────────────────────────────────────────────
log('## 2. Complete Set');
log();

const missingStacks = [];
for (const vt of v) {
    const validTopH = h.filter(t => t.e.W === vt.e.E_T);
    const validBotH = h.filter(t => t.e.W === vt.e.E_B);
    const stacks = validTopH.filter(t => validBotH.some(b => hStackValid(t, b)));
    if (stacks.length === 0) { missingStacks.push(vt.name); }
}

const missingV = [];
for (const topH of h) {
    for (const botH of h) {
        if (!hStackValid(topH, botH)) { continue; }
        if (!v.some(vt => vt.e.W_T === topH.e.E && vt.e.W_B === botH.e.E)) {
            missingV.push(`${topH.name} + ${botH.name}`);
        }
    }
}

if (missingStacks.length === 0 && missingV.length === 0) {
    log('> **PASS** — Complete set. Every transition has a valid match.');
} else {
    if (missingStacks.length > 0) {
        log('> **FAIL** — V tiles with no valid H stack:');
        missingStacks.forEach(n => log(`> - ${n}`));
    }
    if (missingV.length > 0) {
        log('> **FAIL** — H stacks with no matching V tile:');
        missingV.forEach(n => log(`> - ${n}`));
    }
}
log();

// ── 3. Duplicate Detection ────────────────────────────────────────────────────
log('## 3. Duplicates');
log();

const dupes = [];
for (let i = 0; i < blueprints.length; i++) {
    for (let j = i + 1; j < blueprints.length; j++) {
        if (JSON.stringify(blueprints[i].e) === JSON.stringify(blueprints[j].e)) {
            dupes.push(`${blueprints[i].name} == ${blueprints[j].name}`);
        }
    }
}
if (dupes.length === 0) {
    log('> **PASS** — No duplicates.');
} else {
    log('> **FAIL** — Identical edge sets:');
    dupes.forEach(d => log(`> - ${d}`));
}
log();

// ── 4. Connectivity ───────────────────────────────────────────────────────────
log('## 4. Connectivity');
log();

const adj = new Map(blueprints.map(t => [t.name, new Set()]));
const connect = (a, b) => { adj.get(a.name).add(b.name); adj.get(b.name).add(a.name); };

for (const topH of h) {
    for (const botH of h) {
        if (hStackValid(topH, botH)) { connect(topH, botH); }
    }
}
for (const vt of v) {
    for (const topH of h) {
        for (const botH of h) {
            if (!hStackValid(topH, botH)) { continue; }
            if (vRightFitsH(vt, topH, botH)) { connect(vt, topH); connect(vt, botH); }
            if (hStackFitsVLeft(topH, botH, vt)) { connect(vt, topH); connect(vt, botH); }
        }
    }
}
for (const a of v) {
    for (const b of v) {
        if (a !== b && vStacksAbove(a, b)) { connect(a, b); }
    }
}

const tileMap = new Map(blueprints.map(t => [t.name, t]));
const visited = new Set();
const queue = blueprints.slice(0, 1);
while (queue.length) {
    const t = queue.shift();
    if (visited.has(t.name)) { continue; }
    visited.add(t.name);
    for (const n of adj.get(t.name)) {
        if (!visited.has(n)) { queue.push(tileMap.get(n)); }
    }
}

const unreachable = blueprints.filter(t => !visited.has(t.name));
if (unreachable.length === 0) {
    log(`> **PASS** — All ${blueprints.length} blueprints connected.`);
} else {
    log(`> **FAIL** — ${unreachable.length} unreachable:`);
    unreachable.forEach(t => log(`> - ${t.name}`));
}
log();

const outPath = join(root, 'BLUEPRINTVALIDATION.md');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Written: BLUEPRINTVALIDATION.md');
