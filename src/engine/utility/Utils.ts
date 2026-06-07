import type { RandomBetweenTwo, Size2D } from '../definitions/Primitives'

/** General-purpose math and formatting utilities. */
export class Utils {
    /**
     * Flips a Y coordinate between sim space (origin at bottom, increases upward) and
     * Canvas 2D / CSS screen space (origin at top, increases downward). The operation
     * is its own inverse: FlipY(FlipY(y, h), h) === y.
     */
    public static FlipY(y: number, height: number): number {
        return height - y;
    }

    /** Clamps a value between min and max (inclusive). */
    public static Clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    /** Parses a value as a finite number, returning fallback if it is NaN or infinite. */
    public static FiniteNumber(value: unknown, fallback: number): number {
        const numberValue = parseFloat(String(value));
        return Number.isFinite(numberValue) ? numberValue : fallback;
    }

    /** Formats a number to at most maxDecimals decimal places, stripping trailing zeros. */
    public static FormatDecimal(value: number, maxDecimals: number): string {
        return value.toFixed(maxDecimals).replace(/\.?0+$/, '');
    }

    /** Computes the largest pixel canvas size that fits within the window for the given grid dimensions. */
    public static ComputeGridPixelSize(size: Size2D): Size2D {
        const cellPx = Math.max(1, Math.floor(Math.min(window.innerWidth / size.width, window.innerHeight / size.height)));
        return { width: size.width * cellPx, height: size.height * cellPx };
    }

    /** Applies a smooth cubic ease curve to `t` in [0, 1]. */
    public static Smoothstep(t: number): number { return t * t * (3 - 2 * t); }
    /** Linearly interpolates between `a` and `b` by factor `t`. */
    public static Lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
    /** Clamps `value` to [0, 1]. */
    public static Normalize(value: number): number { return Math.max(0, Math.min(1, value)); }
    /** Returns a random 32-bit unsigned integer seed. */
    public static Seed(): number { return Math.floor(Math.random() * 0xFFFFFFFF) }

    /** Handles processing for anything defined as a {@link RandomBetweenTwo} type. */
    public static RandomBetweenTwo<T>(value: T | RandomBetweenTwo<T>): [T, T] {
        if (typeof value === 'object' && value !== null && 'first' in (value as object)) {
            const range = value as RandomBetweenTwo<T>;
            return [range.first, range.second];
        }
        return [value as T, value as T];
    }
}
