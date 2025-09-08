// Graph related
import { type IndexedGraph } from "./metagraph/KGraph";

// Rendering related
import { init_shader_program, buffer_init, set_attrib_data, set_attrib_data_instanced } from "../../utils/webgl/helper";
import { type Positionable } from "../../utils/types/Positionable";
import { CircleInstance } from "./gui/Circle";
import { LineInstance } from "./gui/Line";

/** Quick coupling of number of nodes & number of edges together */
type GraphSize = { num_nodes: number, num_edges: number };

/** Take in a G, and return a G. Made to make `GraphMap` slightly less verbose */
type GraphTransformer<G> = (graph: G) => G;

/** Function that takes in graph G and returns graph G'. The mapping function must preserve the graph types N and E */
type GraphMap<N, E, G extends IndexedGraph<N, E>> = GraphTransformer<G>;

/** Takes in some type G that implements IndexGraph<N,any> and renders it */
export class RenderGraph<N extends Positionable, G extends IndexedGraph<N,any>> {
    private topology: G;

    // NODE RENDERING
    static node_circle_instance = new CircleInstance();
    node_vao: WebGLVertexArrayObject = 0;
    node_program: WebGLProgram = 0;
    node_offset_vbo: WebGLBuffer = 0;
    node_circle_radius: number;

    // EDGE RENDERING
    static edge_line_instance = new LineInstance();
    edge_vao: WebGLVertexArrayObject = 0;
    edge_program: WebGLProgram = 0;
    edge_offset_vbo: WebGLBuffer = 0;
    edge_line_girth: number;

    private dirty_nodes: boolean;
    private dirty_edges: boolean;

    /** Initializes the relevant buffers & vertex arrays, along with attribute data
     *  required for rendering the nodes of our inner IndexedGraph `topology` */
    private init_node_render_data(gl: WebGL2RenderingContext): boolean {
        const program = init_shader_program(gl, "node_vs_shader", "node_fs_shader");
        if (program === null) {
            console.error("Error while initializing Node Shader Program");
            return false;
        }

        this.node_vao = gl.createVertexArray();
        gl.bindVertexArray(this.node_vao);

        const circle_instance_vbo = buffer_init(gl, gl.ARRAY_BUFFER, RenderGraph.node_circle_instance.data(), gl.STATIC_DRAW);
        this.node_offset_vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.node_offset_vbo);

        set_attrib_data(gl, program, {attrib_name: "aVertexPosition", buffer_id: circle_instance_vbo}, 2, gl.FLOAT);
        set_attrib_data_instanced(gl, program, {attrib_name: "aVertexOffset", buffer_id: this.node_offset_vbo}, 3, gl.FLOAT);

        return true;
    }

    /** Initialize the relevant buffers & vertex arrays, along with attribute data
     * required for rendering the edges of our inner IndexedGraph `topology` */
    private init_edge_render_data(gl: WebGL2RenderingContext): boolean {
        const program = init_shader_program(gl, "edge_vs_shader", "edge_fs_shader");
        if (program === null) {
            console.error("Error while initializing Edge Shader Program");
            return false;
        }

        this.edge_vao = gl.createVertexArray();
        gl.bindVertexArray(this.edge_vao);

        const line_instance_vbo = buffer_init(gl, gl.ARRAY_BUFFER, RenderGraph.edge_line_instance.data(), gl.STATIC_DRAW);
        this.edge_offset_vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.edge_offset_vbo);

        set_attrib_data(gl, program, {attrib_name: "aVertexPosition", buffer_id: line_instance_vbo}, 3, gl.FLOAT);
        set_attrib_data_instanced(gl, program, {attrib_name: "aEdgeOffsets", buffer_id: this.edge_offset_vbo}, 4, gl.FLOAT, false, 20);
        set_attrib_data_instanced(gl, program, {attrib_name: "aEdgeID", buffer_id: this.edge_offset_vbo}, 1, gl.FLOAT, false, 20, 20)

        return true;
    }

    constructor(gl: WebGL2RenderingContext, input_graph: G, node_radius: number = 5, edge_girth: number = 5) {
        this.topology = input_graph;
        this.dirty_nodes = false;
        this.dirty_edges = false;
        this.node_circle_radius = node_radius;
        this.edge_line_girth = edge_girth;

        const node_program = init_shader_program(gl, "node_vs_shader", "node_fs_shader");
        if (node_program === null) {
            console.error("Error while initializing Node shader program");
            return;
        }

        const edge_program = init_shader_program(gl, "edge_vs_shader", "edge_fs_shader");
        if (edge_program === null) {
            console.error("Error while initializing Edge shader program");
            return;
        }
        
        this.node_program = node_program;
        this.edge_program = edge_program;
        if (!this.init_node_render_data(gl) || !this.init_edge_render_data(gl)) {
            console.error("Error occurred during RenderGraph::init_node_render_data AND/OR RenderGraph::init_edge_render_data");
            return;
        }
    }

    /** Construct a `Float32Array` of node 'offsets' associated with
     * their current positions and bind said data to the 
     * vertex buffer: `this.node_offsets_vbo`. */
    private build_node_vertices(gl: WebGL2RenderingContext): void {
        const N: number = this.topology.num_nodes();
        const node_offsets: Float32Array = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
            const idx: number = i * 3;
            const coord = this.topology.node_weight(i);

            node_offsets[idx] = coord.get_x();
            node_offsets[idx + 1] = coord.get_y();
            node_offsets[idx + 2] = i;
        }

        gl.bindVertexArray(this.node_vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.node_offset_vbo);
        gl.bufferData(gl.ARRAY_BUFFER, node_offsets, gl.STATIC_DRAW);
    }

    /** Constructs a `Float32Array` of edge `offsets` (where said offsets
     * correspond to the "source" and "sink" nodes of the edge and their
     * associated positions) and binds said data to the vertex buffer:
     * `this.edge_offsets_vbo`. */
    private build_edge_vertices(gl: WebGL2RenderingContext): void {
        const E: number = this.topology.num_edges();
        const edge_offsets: Float32Array = new Float32Array(E * 5);
        for (let i = 0; i < E; i++) {
            const idx: number = i * 5;
            const nodes = this.topology.edge_nodes(i);
            const from_coord = this.topology.node_weight(nodes.from_node);
            const to_coord = this.topology.node_weight(nodes.to_node);

            edge_offsets[idx] = from_coord.get_x();
            edge_offsets[idx + 1] = from_coord.get_y();
            edge_offsets[idx + 2] = to_coord.get_x();
            edge_offsets[idx + 3] = to_coord.get_y();
            edge_offsets[idx + 5] = i;
        }

        gl.bindVertexArray(this.edge_vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.edge_offset_vbo);
        gl.bufferData(gl.ARRAY_BUFFER, edge_offsets, gl.STATIC_DRAW);
    }

    /** Exposes the internal graph of the RenderGraph and updates the dirty field if a change in the number of edges or nodes is observed*/
    public peek_mut(M: GraphMap<N, any, G>): RenderGraph<N,G> {
        const prev_size: GraphSize = { num_nodes: this.topology.num_nodes(), num_edges: this.topology.num_edges() };
        this.topology = M(this.topology);
        this.dirty_nodes = prev_size.num_nodes !== this.topology.num_nodes();
        this.dirty_edges = prev_size.num_edges !== this.topology.num_edges();
        return this;
    }

    public peek(M: (g: Readonly<G>) => void): RenderGraph<N,G> {
        M(this.topology);
        return this;
    };

    public expose_graph(): G { return this.topology; }
    public is_dirty(): boolean { return this.dirty_edges || this.dirty_nodes; }
    
    /** Renders the internal `IndexedGraph`'s nodes and vertices. If the graph's nodes 
     * or edges are "dirty" (e.g. the number of nodes and/or edges of the internal
     * graph has changed from a call to `RenderGraph::update`) then the node vertices
     * and / or edge vertices are re-built. */
    public draw(gl: WebGL2RenderingContext): void {
        if (this.dirty_nodes) { 
            this.dirty_nodes = false;
            this.build_node_vertices(gl); 
        }

        if (this.dirty_edges) { 
            this.dirty_edges = false;
            this.build_edge_vertices(gl); 
        }

        gl.bindVertexArray(this.node_vao);
        gl.useProgram(this.node_program);
        gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, RenderGraph.node_circle_instance.num_points(), this.topology.num_nodes());

        gl.bindVertexArray(this.edge_vao);
        gl.useProgram(this.edge_program);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, RenderGraph.edge_line_instance.num_points(), this.topology.num_edges());
    }
}

/** Takes in some type G that implements IndexGraph<N,any> and renders it */
// export class RenderGraph<N extends Positionable, G extends IndexedGraph<N,any>> {
//     // private static node_circle_instance: CircleInstance = new CircleInstance(81);

//     private topology: G;
//     private program: WebGLProgram;
    
//     private vao: WebGLVertexArrayObject;
//     private vbo: WebGLBuffer;
//     private ebo: WebGLBuffer;

//     private uHoverLocation: WebGLUniformLocation;
//     private uSelectLocation: WebGLUniformLocation;
//     private uIsVertexLocation: WebGLUniformLocation;

//     private dirty_nodes: boolean;
//     private dirty_edges: boolean;

//     constructor(gl: WebGL2RenderingContext, input_graph: G) {
//         this.topology = input_graph;
//         this.dirty_nodes = false;
//         this.dirty_edges = false;

//         this.program = init_shader_program(gl, render_graph_vs_text, render_graph_fs_text)!;
//         this.vao = gl.createVertexArray();
//         this.vbo = gl.createBuffer();
//         this.ebo = gl.createBuffer();

//         const aVPos: number = gl.getAttribLocation(this.program, "aVertexPosition");
        
//         gl.bindVertexArray(this.vao);
//         gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
//         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);

//         gl.vertexAttribPointer(
//             aVPos,
//             3,
//             gl.FLOAT,
//             false,
//             0,
//             0
//         );

//         gl.enableVertexAttribArray(aVPos);

//         this.uHoverLocation = gl.getUniformLocation(this.program, "uHoverIndex")!;
//         this.uSelectLocation = gl.getUniformLocation(this.program, "uSelectedIndex")!;
//         this.uIsVertexLocation = gl.getUniformLocation(this.program, "uIsVertex")!;

//         gl.useProgram(this.program);
//         gl.uniform1i(this.uHoverLocation, -1);
//         gl.uniform1i(this.uSelectLocation, -1);
//     }

//     private build_vertices(gl: WebGL2RenderingContext) {
//         const positions: Float32Array = new Float32Array(this.topology.num_nodes() * 3);
//         for (let n = 0; n < this.topology.num_nodes(); n++) {
//             const [x, y] = this.topology.node_weight(n).get_xy();
//             const buffer_idx: number = n * 3;

//             positions[buffer_idx] = x;
//             positions[buffer_idx + 1] = y;
//             positions[buffer_idx + 2] = n;
//         }

//         gl.bindVertexArray(this.vao);
//         gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
//         gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
//     }

//     private build_edges(gl: WebGL2RenderingContext) {
//         const indices: number[] = [];

//         for (let e = 0; e < this.topology.num_edges(); e++) {
//             const L = this.topology.edge_nodes(e);
//             indices.push(L.from_node);
//             indices.push(L.to_node);
//         }

//         gl.bindVertexArray(this.vao);
//         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
//         gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
//     }

//     /** Exposes the internal graph of the RenderGraph and updates the dirty field if a change in the number of edges or nodes is observed*/
//     public update(M: GraphMap<N, any, G>): RenderGraph<N,G> {
//         const prev_size: GraphSize = { num_nodes: this.topology.num_nodes(), num_edges: this.topology.num_edges() };
//         this.topology = M(this.topology);
//         this.dirty_nodes = prev_size.num_nodes !== this.topology.num_nodes();
//         this.dirty_edges = prev_size.num_edges !== this.topology.num_edges();
//         return this;
//     }

//     public peek(M: (g: Readonly<G>) => void): RenderGraph<N,G> {
//         M(this.topology);
//         return this;
//     };

//     public is_dirty(): boolean { return this.dirty_edges || this.dirty_nodes; }
//     public expose_graph(): G { return this.topology; }

//     public set_uniform_indices(gl: WebGL2RenderingContext, hover_index: node_idx_t, select_index: node_idx_t) {
//         gl.useProgram(this.program);
//         gl.uniform1i(this.uHoverLocation, hover_index);
//         gl.uniform1i(this.uSelectLocation, select_index);
//     }

//     /** Draws this RenderGraph */
//     public draw(gl: WebGL2RenderingContext) {

//         if (this.dirty_nodes) {
//             // UPDATE VERTICES
//             this.dirty_nodes = false;
//             this.build_vertices(gl);
//         }

//         if (this.dirty_edges) {
//             // UPDATE EDGES
//             this.dirty_edges = false;
//             this.build_edges(gl);
//         }

//         gl.useProgram(this.program);
//         gl.bindVertexArray(this.vao);

//         gl.uniform1i(this.uIsVertexLocation, 1);
//         gl.drawElements(gl.LINES, this.topology.num_edges() * 2, gl.UNSIGNED_INT, 0);
        
//         gl.uniform1i(this.uIsVertexLocation, 0);
//         gl.drawArrays(gl.POINTS, 0, this.topology.num_nodes());
//     }
// }