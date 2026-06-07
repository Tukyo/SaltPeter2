/** Represents two vectors. */
export interface Vec2 { x: number; y: number; }

/** Represents a color. */
export interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}

/** Represents a 2D size. */
export interface Size2D { width: number; height: number; }

/** Represents a 2D rectangle. */
export interface Rect2D {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

/** Represents a range from min to max. */
export interface NumberRange { min: number; max: number; }

/** Represents two values of the same type. */
export interface RandomBetweenTwo<T> { first: T; second: T; }
