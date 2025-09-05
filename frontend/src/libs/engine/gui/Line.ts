

// class EdgeVertexBuilder {
//     vertex_data: Float32Array;
//     constructor()
// }

export class LineInstance {
    private vertex_data: Float32Array; // [pointBL(x,y), pointTL(x,y), pointBR(x,y), pointTR(x,y)
    public constructor() { 
        this.vertex_data = new Float32Array([
            0.0, 0.0, 0.0, // (p.x, p.y, index)
            0.0, 0.0, 1.0,
            0.0, 0.0, 2.0,
            0.0, 0.0, 3.0
        ]);
    }
    public data(): Float32Array { return this.vertex_data; }
    public num_points(): number { return 4; }
    public vertex_size(): number { return 3; }
}