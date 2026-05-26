import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)));

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')).version;

const now = new Date();
const date = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;

const changelogPath = join(root, 'CHANGELOG.md');
const changelog = readFileSync(changelogPath, 'utf-8');

const newEntry = `## [${version}] - ${date}\n### Updates & Changes\n\n### Bug Fixes\n\n---\n\n`;
const anchor = '# Changelog\n\n---\n\n';
writeFileSync(changelogPath, changelog.replace(anchor, anchor + newEntry), 'utf-8');
