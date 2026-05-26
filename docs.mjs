// Extracts JSDoc from exported classes in each engine subdirectory and injects
// them into the corresponding README.md between <!-- API_START --> / <!-- API_END --> markers.
// Also injects breadcrumb navigation between <!-- HIERARCHY_START --> / <!-- HIERARCHY_END --> markers.
// Hand-authored content outside the markers is never modified.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, relative, basename } from 'path';
import ts from 'typescript';

const ENGINE_DIR = resolve('src/engine');

// ─── NitrateProcess lifecycle hooks ─────────────────────────────────────────

function getNitrateProcessHooks() {
    const filePath = join(ENGINE_DIR, 'NitrateProcess.ts');
    const source = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
    const hooks = new Set();

    ts.forEachChild(sourceFile, node => {
        if (ts.isClassDeclaration(node)) {
            for (const member of node.members) {
                if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
                    const name = member.name?.getText(sourceFile);
                    if (name) { hooks.add(name); }
                }
            }
        }
    });

    return hooks;
}

const LIFECYCLE_HOOKS = getNitrateProcessHooks();
const MARKER_START = '<!-- API_START -->';
const MARKER_END = '<!-- API_END -->';
const HIERARCHY_START = '<!-- HIERARCHY_START -->';
const HIERARCHY_END = '<!-- HIERARCHY_END -->';
const ICONS_START = '<!-- ICONS_START -->';
const ICONS_END = '<!-- ICONS_END -->';
const MATERIALS_START = '<!-- MATERIALS_START -->';
const MATERIALS_END = '<!-- MATERIALS_END -->';
const SHADERS_START = '<!-- SHADERS_START -->';
const SHADERS_END = '<!-- SHADERS_END -->';
const TOC_START = '<!-- TABLE_OF_CONTENTS_START -->';
const TOC_END = '<!-- TABLE_OF_CONTENTS_END -->';

// ─── Breadcrumb generation ───────────────────────────────────────────────────

function generateBreadcrumb(dirPath) {
    const rel = relative(ENGINE_DIR, dirPath);
    if (!rel) { return null; }

    const parts = rel.split(/[\\/]/);
    const depth = parts.length;
    const crumbs = [];

    const nitratePath = '../'.repeat(depth) + 'README.md';
    crumbs.push(`[Nitrate](${nitratePath})`);

    const toPascalCase = s => s.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

    for (let i = 0; i < parts.length - 1; i++) {
        const label = toPascalCase(parts[i]);
        const linkPath = '../'.repeat(depth - i - 1) + 'README.md';
        crumbs.push(`[${label}](${linkPath})`);
    }

    const current = parts[parts.length - 1];
    crumbs.push(toPascalCase(current));

    return crumbs.join(' / ');
}

// ─── JSDoc extraction ────────────────────────────────────────────────────────

function getJSDocComment(node, sourceFile) {
    const ranges = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart());
    if (!ranges) { return null; }
    for (const range of ranges) {
        if (range.kind !== ts.SyntaxKind.MultiLineCommentTrivia) { continue; }
        const text = sourceFile.text.slice(range.pos, range.end);
        if (text.startsWith('/**')) { return text; }
    }
    return null;
}

function hasInternalTag(node, sourceFile) {
    const ranges = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart());
    if (!ranges) { return false; }
    for (const range of ranges) {
        const text = sourceFile.text.slice(range.pos, range.end);
        if (text.includes('@omitfromdocs')) { return true; }
        if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia && text.startsWith('/**') && /@internal/.test(text)) { return true; }
    }
    return false;
}

function getJSDocSummary(node, sourceFile) {
    const comment = getJSDocComment(node, sourceFile);
    if (!comment) { return null; }
    const lines = comment
        .replace(/^\/\*\*/, '')
        .replace(/\*\/$/, '')
        .split('\n')
        .map(l => l.replace(/^\s*\*\s?/, '').trimEnd())
        .filter(l => !l.trimStart().startsWith('@'));
    while (lines.length > 0 && lines[0].trim() === '') { lines.shift(); }
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') { lines.pop(); }
    return lines.join('\n') || null;
}

function getLineNumber(node, sourceFile) {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function getMethodSignature(node, sourceFile) {
    const name = node.name?.getText(sourceFile) ?? '?';
    const params = node.parameters
        ?.map(p => p.getText(sourceFile).replace(/\s+/g, ' '))
        .join(', ') ?? '';
    const ret = node.type ? ': ' + node.type.getText(sourceFile) : '';
    const isStatic = node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ? 'static ' : '';
    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : '';
    return `${isStatic}${isAsync}${name}(${params})${ret}`;
}

function extractClasses(filePath, dirPath) {
    const source = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
    const fileName = basename(filePath);
    const classes = [];
    const interfaces = [];

    function visit(node) {
        const isExported = node.modifiers?.some(m =>
            m.kind === ts.SyntaxKind.ExportKeyword
        );

        if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && isExported && node.name) {
            if (!hasInternalTag(node, sourceFile)) {
                const ifaceSource = source.slice(node.getStart(sourceFile), node.getEnd()).trim().replace(/^export\s+/, '');
                interfaces.push(ifaceSource);
            }
        }

        if (ts.isEnumDeclaration(node) && isExported && node.name) {
            if (!hasInternalTag(node, sourceFile)) {
                const enumSource = source.slice(node.getStart(sourceFile), node.getEnd()).trim().replace(/^export\s+/, '');
                interfaces.push(enumSource);
            }
        }

        if (ts.isVariableStatement(node) && isExported) {
            const isConst = !!(node.declarationList.flags & ts.NodeFlags.Const);
            if (isConst && !hasInternalTag(node, sourceFile)) {
                const constSource = source.slice(node.getStart(sourceFile), node.getEnd()).trim().replace(/^export\s+/, '');
                interfaces.push(constSource);
            }
        }

        if (ts.isClassDeclaration(node) && isExported && node.name) {
            if (hasInternalTag(node, sourceFile)) { return; }

            const extendsNitrateProcess = node.heritageClauses?.some(clause =>
                clause.token === ts.SyntaxKind.ExtendsKeyword &&
                clause.types.some(t => t.expression.getText(sourceFile) === 'NitrateProcess')
            );

            const className = node.name.getText(sourceFile);
            const classDoc = getJSDocSummary(node, sourceFile);
            const classLine = getLineNumber(node, sourceFile);
            const methods = [];

            for (const member of node.members) {
                const isPublic = !member.modifiers?.some(m =>
                    m.kind === ts.SyntaxKind.PrivateKeyword ||
                    m.kind === ts.SyntaxKind.ProtectedKeyword
                );
                if (!isPublic) { continue; }
                if (hasInternalTag(member, sourceFile)) { continue; }

                if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
                    if (ts.isConstructorDeclaration(member)) { continue; }
                    const name = member.name?.getText(sourceFile);
                    if (LIFECYCLE_HOOKS.has(name)) { continue; }
                    const sig = getMethodSignature(member, sourceFile);
                    const doc = getJSDocSummary(member, sourceFile);
                    const line = getLineNumber(member, sourceFile);
                    methods.push({ name, sig, doc, line, absPath: filePath });
                }
            }

            classes.push({ name: className, doc: classDoc, line: classLine, fileName, absPath: filePath, methods, interfaces: [] });
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    if (interfaces.length > 0 && classes.length > 0) { classes[0].interfaces = interfaces; }
    else if (interfaces.length > 0) { classes.push({ typesOnly: true, interfaces, fileName }); }
    return classes;
}

// ─── Global link map ─────────────────────────────────────────────────────────

function buildGlobalLinkMap() {
    const map = new Map();

    function walkForLinks(dirPath) {
        const tsFiles = readdirSync(dirPath)
            .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && f !== 'Index.ts');

        for (const f of tsFiles) {
            const filePath = join(dirPath, f);
            try {
                const classes = extractClasses(filePath, dirPath);
                for (const cls of classes) {
                    map.set(cls.name, { absPath: cls.absPath, line: cls.line });
                    for (const method of cls.methods) {
                        if (method.name) { map.set(method.name, { absPath: method.absPath, line: method.line }); }
                    }
                }
            } catch { /* skip unparseable files */ }
        }

        for (const entry of readdirSync(dirPath)) {
            const full = join(dirPath, entry);
            if (statSync(full).isDirectory()) { walkForLinks(full); }
        }
    }

    walkForLinks(ENGINE_DIR);
    return map;
}

// ─── Component icon table ────────────────────────────────────────────────────

function generateIconSection(dirPath) {
    const definitionsDir = join(dirPath, 'definitions');
    if (!existsSync(definitionsDir)) { return null; }

    const rows = [];

    function walkDefs(dir) {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (!statSync(full).isDirectory()) { continue; }

            const iconPath = join(full, 'icon.png');
            if (existsSync(iconPath)) {
                let label = entry.charAt(0).toUpperCase() + entry.slice(1);
                const tsFiles = readdirSync(full).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
                for (const f of tsFiles) {
                    const src = readFileSync(join(full, f), 'utf8');
                    const match = src.match(/static readonly label\s*=\s*['"]([^'"]+)['"]/);
                    if (match) { label = match[1]; break; }
                }
                const relIcon = relative(dirPath, iconPath).replace(/\\/g, '/');
                rows.push({ label, relIcon });
            }

            walkDefs(full);
        }
    }

    walkDefs(definitionsDir);
    if (rows.length === 0) { return null; }

    return rows.map(({ label, relIcon }) => `![${label}](${relIcon})`).join(' ');
}

// ─── Material table ──────────────────────────────────────────────────────────

const PHASE_ORDER = ['solid', 'powder', 'liquid', 'gas', 'fire'];
const PHASE_COLORS = {
    solid:  'gray',
    powder: 'goldenrod',
    liquid: 'royalblue',
    gas:    'green',
    fire:   'red',
};

function generateMaterialsTable(dirPath) {
    const phaseDirs = PHASE_ORDER.map(p => join(dirPath, p));
    if (!phaseDirs.some(d => existsSync(d))) { return null; }

    const materials = [];

    for (const phase of PHASE_ORDER) {
        const phaseDir = join(dirPath, phase);
        if (!existsSync(phaseDir)) { continue; }

        const entries = readdirSync(phaseDir)
            .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

        for (const f of entries) {
            const src = readFileSync(join(phaseDir, f), 'utf8');
            const nameMatch = src.match(/name:\s*['"]([^'"]+)['"]/);
            const tagsMatch = src.match(/tags:\s*\[([^\]]+)\]/);
            if (!nameMatch) { continue; }
            const name = nameMatch[1];
            if (name === 'blueprint') { continue; }
            const hasDev = tagsMatch ? tagsMatch[1].includes('dev') : false;
            if (hasDev) { continue; }
            materials.push({ name, phase });
        }

    }

    materials.sort((a, b) => {
        const pi = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
        return pi !== 0 ? pi : a.name.localeCompare(b.name);
    });

    if (materials.length === 0) { return null; }

    const byPhase = {};
    for (const phase of PHASE_ORDER) { byPhase[phase] = []; }
    for (const { name, phase } of materials) {
        const label = name.charAt(0).toUpperCase() + name.slice(1).replace(/_([a-z])/g, (_, c) => ` ${c.toUpperCase()}`);
        byPhase[phase].push(label);
    }

    const maxRows = Math.max(...PHASE_ORDER.map(p => byPhase[p].length));

    const headers = PHASE_ORDER.map(p => {
        const color = PHASE_COLORS[p];
        return `$\{\\color{${color}}\\textsf{${p}}}$`;
    });

    const lines = ['## Material List', ''];
    lines.push('| ' + headers.join(' | ') + ' |');
    lines.push(PHASE_ORDER.map(() => '|-------').join('') + '|');

    for (let i = 0; i < maxRows; i++) {
        const row = PHASE_ORDER.map(p => byPhase[p][i] ?? '');
        lines.push('| ' + row.join(' | ') + ' |');
    }

    lines.push('');
    return lines.join('\n');
}

// ─── Table of contents ───────────────────────────────────────────────────────

function generateTableOfContents(dirPath) {
    const rows = [];

    function walk(dir, depth) {
        const entries = readdirSync(dir)
            .filter(e => statSync(join(dir, e)).isDirectory())
            .sort();

        for (const entry of entries) {
            const full = join(dir, entry);
            if (!existsSync(join(full, 'README.md'))) { continue; }
            const relPath = relative(dirPath, full).replace(/\\/g, '/');
            const indent = depth > 0 ? '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(depth) + '↳ ' : '';
            rows.push(`${indent}[\`${entry}/\`](${relPath}/README.md)  `);
            walk(full, depth + 1);
        }
    }

    walk(dirPath, 0);
    if (rows.length === 0) { return null; }

    return ['## Table of Contents', '', ...rows, ''].join('\n');
}

// ─── Shader file table ───────────────────────────────────────────────────────

function generateShadersTable(dirPath) {
    const groups = new Map();

    function walkWgsl(dir) {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) {
                walkWgsl(full);
            } else if (entry.endsWith('.wgsl')) {
                const rel = relative(dirPath, dir).replace(/\\/g, '/');
                if (!groups.has(rel)) { groups.set(rel, []); }
                groups.get(rel).push(entry);
            }
        }
    }

    walkWgsl(dirPath);
    if (groups.size === 0) { return null; }

    const sorted = [...groups.keys()].sort((a, b) => {
        const aParts = a.split('/');
        const bParts = b.split('/');
        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
            const cmp = aParts[i].localeCompare(bParts[i]);
            if (cmp !== 0) { return cmp; }
        }
        return aParts.length - bParts.length;
    });

    const lines = ['## Shader Files', ''];
    lines.push('| Folder | Files |');
    lines.push('|--------|-------|');

    for (const key of sorted) {
        const files = groups.get(key).sort();
        const links = files.map(f => {
            const name = f.replace(/\.wgsl$/, '');
            const path = `${key}/${f}`;
            return `[\`${name}\`](${path})`;
        });
        lines.push(`| \`${key}/\` | ${links.join(', ')} |`);
    }

    lines.push('');
    return lines.join('\n');
}

// ─── Markdown generation ─────────────────────────────────────────────────────

function resolveLinks(text, currentDir) {
    return text.replace(/\{@link\s+(\w+)\}/g, (_, name) => {
        const entry = GLOBAL_LINK_MAP.get(name);
        if (!entry) { return `\`${name}\``; }
        const relPath = relative(currentDir, entry.absPath).replace(/\\/g, '/');
        return `[\`${name}\`](${relPath})`;
    });
}

function generateApiSection(classes, dirPath) {
    if (classes.length === 0) { return ''; }

    const lines = ['---', '', '## API', ''];

    for (const cls of classes) {
        if (cls.typesOnly) {
            const label = cls.fileName.replace(/\.ts$/, '');
            lines.push(`### [\`${label}\`](${cls.fileName})`);
            lines.push('');
            lines.push('| Interfaces & Types |');
            lines.push('|--------------------|');
            for (const iface of cls.interfaces) {
                lines.push('```ts');
                lines.push(iface);
                lines.push('```');
                lines.push('');
            }
            lines.push('---');
            lines.push('');
            continue;
        }

        lines.push(`### [\`${cls.name}\`](${cls.fileName})`);
        if (cls.doc) { lines.push(resolveLinks(cls.doc, dirPath)); }
        lines.push('');

        if (cls.interfaces && cls.interfaces.length > 0) {
            lines.push('| Interfaces & Types |');
            lines.push('|--------------------|');
            for (const iface of cls.interfaces) {
                lines.push('```ts');
                lines.push(iface);
                lines.push('```');
                lines.push('');
            }
        }

        if (cls.methods.length > 0) {
            lines.push('| Method | Description |');
            lines.push('|--------|-------------|');
            for (const method of cls.methods) {
                const desc = method.doc
                    ? resolveLinks(method.doc.replace(/\n+/g, ' ').trim(), dirPath)
                    : '—';
                const sig = method.sig.replace(/\|/g, '\\|');
                lines.push(`| [\`${sig}\`](${cls.fileName}) | ${desc} |`);
            }
        }

        lines.push('');
        lines.push('---');
        lines.push('');
    }

    return lines.join('\n');
}

// ─── README injection ────────────────────────────────────────────────────────

function injectSection(content, startMarker, endMarker, generated, onlyIfPresent = false) {
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx === -1) {
        if (onlyIfPresent) { return content; }
        return content.trimEnd() + `\n\n${startMarker}\n${generated}\n${endMarker}\n`;
    }

    const before = content.slice(0, startIdx);
    const after = endIdx === -1 ? '' : content.slice(endIdx + endMarker.length);
    return `${before}${startMarker}\n${generated}\n${endMarker}${after}`;
}

function injectIntoReadme(readmePath, dirPath, allClasses) {
    let content = readFileSync(readmePath, 'utf8');

    const breadcrumb = generateBreadcrumb(dirPath);
    if (breadcrumb) {
        content = injectSection(content, HIERARCHY_START, HIERARCHY_END, breadcrumb);
    }

    const iconSection = generateIconSection(dirPath);
    if (iconSection) {
        content = injectSection(content, ICONS_START, ICONS_END, iconSection, true);
    }

    const materialsTable = generateMaterialsTable(dirPath);
    if (materialsTable) {
        content = injectSection(content, MATERIALS_START, MATERIALS_END, materialsTable, true);
    }

    const shadersTable = generateShadersTable(dirPath);
    if (shadersTable) {
        content = injectSection(content, SHADERS_START, SHADERS_END, shadersTable, true);
    }

    const toc = generateTableOfContents(dirPath);
    if (toc) {
        content = injectSection(content, TOC_START, TOC_END, toc, true);
    }

    if (allClasses.length > 0) {
        const apiMarkdown = generateApiSection(allClasses, dirPath);
        content = injectSection(content, MARKER_START, MARKER_END, apiMarkdown);
    }

    writeFileSync(readmePath, content, 'utf8');
}

// ─── Main ────────────────────────────────────────────────────────────────────

function processDirectory(dirPath) {
    const readmePath = join(dirPath, 'README.md');
    if (!existsSync(readmePath)) { return; }

    const tsFiles = readdirSync(dirPath)
        .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && f !== 'Index.ts')
        .map(f => join(dirPath, f));

    const allClasses = tsFiles.flatMap(f => extractClasses(f, dirPath));
    injectIntoReadme(readmePath, dirPath, allClasses);
    console.log(`✓ ${dirPath.replace(ENGINE_DIR, 'engine')}`);
}

function walk(dirPath) {
    processDirectory(dirPath);
    for (const entry of readdirSync(dirPath)) {
        const full = join(dirPath, entry);
        if (statSync(full).isDirectory()) { walk(full); }
    }
}

const GLOBAL_LINK_MAP = buildGlobalLinkMap();

const target = process.argv[2];

if (target) {
    const targetDir = resolve(join('src/engine', target));
    if (!existsSync(targetDir)) {
        console.error(`Directory not found: src/engine/${target}`);
        process.exit(1);
    }
    console.log(`Generating docs for src/engine/${target}...\n`);
    processDirectory(targetDir);
} else {
    console.log('Generating docs...\n');
    walk(ENGINE_DIR);
}

console.log('\nDone.');
