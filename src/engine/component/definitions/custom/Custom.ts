import { Component } from '../../Component';

/** Base class for all custom game scripts. Extend this to add game logic to a GameObject. */
export abstract class CustomComponent extends Component {
    readonly type = 'CustomComponent' as const;
}
