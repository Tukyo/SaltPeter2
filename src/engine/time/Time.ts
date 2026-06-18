/** 
 * Provides read-only access to engine timing values. Updated by the engine each frame before Update fires.
 * 
 * ```ts
 * Nitrate.Time.now // Current timestamp in milliseconds
 * Nitrate.Time.deltaTime // Time since last frame in seconds
 * Nitrate.Time.frame // Frame counter, increments every tick
 * ```
 */
export class Time {
    /** The timestamp of the current frame in milliseconds, as provided by requestAnimationFrame. */
    public static now: number = 0;

    /** Time in seconds elapsed since the previous frame. */
    public static deltaTime: number = 0;

    /** Total number of frames elapsed since the engine started. */
    public static frame: number = 0;

    private static previous: number = 0;

    /** Called by the engine at the start of each tick. @internal*/
    public static Tick(now: number): void {
        Time.deltaTime = Time.previous > 0 ? (now - Time.previous) / 1000 : 0;
        Time.previous = now;
        Time.now = now;
        Time.frame++;
    }
}
