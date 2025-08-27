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

    distance<P extends Positionable>(p: P, q: P): number {
        const [x1, y1] = p.get_xy();
        const [x2, y2] = q.get_xy();
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    distance_squared<P extends Positionable>(p: P, q: P): number {
        const [x1, y1] = p.get_xy();
        const [x2, y2] = q.get_xy();
        return Math.hypot(x2 - x1, y2 - y1);
    }
}