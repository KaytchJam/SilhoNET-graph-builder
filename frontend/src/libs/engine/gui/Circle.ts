
/** Simple representation of a circle and its associated vertex data. To be used for instanced rendering */
export class CircleInstance {
    private vertex_data: Float32Array;
    private rad: number;

    /** Create a `CircleInstance` where `boundary_points` defines the number
     * of points to be on the circumference of the circle. The greater the
     * number chosen for `boundary_points` is, the more "circular" the circle
     * will appear. */
    public constructor(boundary_points: number = 9, radius = 1.0) {
        boundary_points = Math.max(9, boundary_points); // the minimum number of points we'll allow is 9

        this.vertex_data = new Float32Array((boundary_points + 1) * 2);
        this.rad = radius;

        const delta_theta: number = 2 * Math.PI / (boundary_points - 1);
        let theta: number = 0.0;

        // central vertex
        this.vertex_data[0] = 0.0;
        this.vertex_data[1] = 0.0;

        // the surrounding vertex_data
        for (let i = 0; i < boundary_points - 1; i++) {
            const idx: number = (i + 1) * 2;
            this.vertex_data[idx] = Math.cos(theta) * this.rad;
            this.vertex_data[idx + 1] = Math.sin(theta) * this.rad;
            theta += delta_theta;
        }

        this.vertex_data[this.vertex_data.length - 2] = this.rad;
        this.vertex_data[this.vertex_data.length - 1] = 0.0;
    }

    /** Return the number of points used to construct this circle */
    public num_points(): number { return this.vertex_data.length / 2; }

    /** Retrieve the radius of this circle  */
    public radius(): number { return this.rad; }

    /** Extract the underlying vertex data of this circle */
    public data(): Float32Array { return this.vertex_data; }
}