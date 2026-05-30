import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)));

const bumpType = process.argv[2] ?? 'patch';
if (!['major', 'minor', 'patch'].includes(bumpType)) {
    console.error(`Invalid bump type: "${bumpType}". Use major, minor, or patch.`);
    process.exit(1);
}

const currentVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')).version;
let [major, minor, patch] = currentVersion.split('.').map(Number);
if (bumpType === 'major') { major++; minor = 0; patch = 0; }
else if (bumpType === 'minor') { minor++; patch = 0; }
else { patch++; }
const version = `${major}.${minor}.${patch}`;

const changelogPath = join(root, 'CHANGELOG.md');
const changelog = readFileSync(changelogPath, 'utf-8');

const newEntry = `## [${version}] - [DATE_HERE]\n### Updates & Changes\n\n### Bug Fixes\n\n---\n\n`;
const anchor = '# Changelog\n\n---\n\n';
writeFileSync(changelogPath, changelog.replace(anchor, anchor + newEntry), 'utf-8');
