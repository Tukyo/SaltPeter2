import { SandboxScene } from './sandbox/SandboxScene';
import { WorldScene } from './world/WorldScene';
import { EditorScene } from './editor/EditorScene';

import { Nitrate } from '@Nitrate';

export const SceneRegistry: Nitrate.SceneEntry[] = [
    { label: 'Sandbox', factory: () => new SandboxScene() },
    { label: 'World', factory: () => new WorldScene() },
    { label: 'Editor', factory: () => new EditorScene() }
];
