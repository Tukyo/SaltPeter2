import type { Vec2 } from '../../../definitions/Primitives';

import { Component } from '../../Component';

export abstract class Collider extends Component {
    isTrigger: boolean = false;
    offset: Vec2 = { x: 0, y: 0 };
}
