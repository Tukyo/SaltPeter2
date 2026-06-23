import { Component } from '../../Component';

import iconUrl from './icon.png';

/** Base class for all custom game scripts. Extend this to add game logic to a GameObject. */
export abstract class CustomComponent extends Component {
    readonly type = 'CustomComponent' as const;
    static readonly icon = iconUrl;
    static get label(): string { return this.name; }
}
