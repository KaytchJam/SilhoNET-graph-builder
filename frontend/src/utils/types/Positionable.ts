/** Interface for any 2D "Point-like" type.
 * Maybe I should renamed it to "Positionable2D".
 * Implementing this gives you access to all the
 * functions in `ImplPositionable`. */
export interface Positionable {
    get_x(): number;
    get_y(): number;
    get_xy(): [number, number];

    set_x(x: number): void;
    set_y(y: number): void;
    set_xy(x: number, y: number): void;
}

/** Functions available to all classes that implement `Positionable` */
export const ImplPositionable = {
    /** Calculates the euclidean distance between Positionable p and q */
    distance<P extends Positionable>(p: P, q: P): number {
        const [x1, y1] = p.get_xy();
        const [x2, y2] = q.get_xy();
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    /** Calculates the squared euclidean distance between Positionable p and q */
    distance_squared<P extends Positionable>(p: P, q: P): number {
        const [x1, y1] = p.get_xy();
        const [x2, y2] = q.get_xy();
        return Math.hypot(x2 - x1, y2 - y1);
    },
    
    /** Adds two positionables together and returns the destination to `dest`. If no destination
     * is provided, then `Positionable p` (the first argument) is used as the destination. */
    add<P extends Positionable>(p: P, q: P, dest?: P | undefined): P {
        if (dest === undefined) { dest = p; }
        dest.set_xy(p.get_x() + q.get_x(), p.get_y() + q.get_y());
        return dest;
    }
}