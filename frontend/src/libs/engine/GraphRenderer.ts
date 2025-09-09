// Graph related
import { type IndexedGraph } from "./metagraph/KGraph";

// Rendering related
import { init_shader_program, buffer_init, buffer_init_empty, set_attrib_data, set_attrib_data_instanced, quick_uniform } from "../../utils/webgl/helper";
import { type Positionable } from "../../utils/types/Positionable";
import { CircleInstance } from "./gui/Circle";
import { LineInstance } from "./gui/Line";

/** Quick coupling of number of nodes & number of edges together */
type GraphSize = { num_nodes: number, num_edges: number };

/** Take in a G, and return a G. Made to make `GraphMap` slightly less verbose */
type GraphTransformer<G> = (graph: G) => G;

/** Function that takes in graph G and returns graph G'. The mapping function must preserve the graph types N and E */
type GraphMap<N, E, G extends IndexedGraph<N, E>> = GraphTransformer<G>;

const glsl = (x: any) => x;

const NODE_VS_SHADER = glsl`
    precision lowp float;

    attribute vec2 aVertexPosition;
    attribute vec3 aVertexOffset;
    
    uniform vec2 uResolution2D;
    uniform float uNodeRadius;

    /** Converts from "Canvas Coordinates" to Normalized Device Coordinates. 
     * Flips the y-axis during this conversion. */
    vec2 canvas_to_ndc(vec2 canvas_pos, vec2 res) {
        return (canvas_pos.x, res.y - canvas_pos.y) / res * 2.0 - vec2(1.0);
    }

    void main() {
        // compose it all together -> convert to ndc
        vec2 shifted = aVertexPosition * uNodeRadius + aVertexOffset.xy;
        vec2 ndc = canvas_to_ndc(shifted, uResolution2D);
        gl_Position = vec4(ndc, 0.0, 1.0);
    }
`;

const NODE_FS_SHADER = glsl`
    precision lowp float;

    void main() {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
`;

const EDGE_VS_SHADER = glsl`
    precision lowp float;

    attribute vec3 aVertexPosition;
    attribute vec4 aEdgeOffsets; // FROM POSITION (xy) -> TO POSITION (zw)
    attribute float aEdgeID;

    uniform vec2 uResolution2D;
    uniform float uEdgeGirth;

    vec3 Z = vec3(0.0, 0.0, -1.0);

    /** Calculate the "normal" (perpendicular) of our line's direction  */
    vec2 find_normal_2d(vec2 dir) {
        return vec2(-dir.y, dir.x);
    }

    /** Determine the "side" of the line the normal show be on based on the index
     * of the line point. */
    vec2 determine_normal_direction(vec2 normal, int index) {
        if (index == 0 || index == 2) { normal *= -1.0; }
        return normal;
    }

    /** Determine which offset vector (from or to) the line point
     * should be associated with based on its index */
    vec2 determine_point_offset(vec2 from, vec2 to, int index) {
        return (index < 2) ? from : to;
    }

    /** Converts from "Canvas Coordinates" to Normalized Device Coordinates. 
     * Flips the y-axis during this conversion. */
    vec2 canvas_to_ndc(vec2 canvas_pos, vec2 res) {
        return (canvas_pos.x, res.y - canvas_pos.y) / res * 2.0 - vec2(1.0);
    }

    void main() {
        int line_index = int(aVertexPosition.z);

        // get all our relevant vectors here (line-direction, line-normal, point-offset)
        vec2 direction = normalize(aEdgeOffsets.zw - aEdgeOffsets.xy);
        vec2 normal = determine_normal_direction(find_normal_2d(direction), line_index);

        // this does nothing... just filler, because it's my code
        if (int(aEdgeID) >= 0) {
            float filler = 1.0;
            filler = filler + 1.0;
        }

        // compose it all together -> convert to NDC
        vec2 shifted = offset + uEdgeGirth * normal;
        vec2 ndc = canvas_to_ndc(shifted, uResolution2D);
        gl_Position = vec4(ndc, 0.0, 1.0);
    }
`;

const EDGE_FS_SHADER = glsl`
    precision lowp float;

    void main() {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
`;

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
        this.node_offset_vbo = buffer_init_empty(gl, gl.ARRAY_BUFFER);

        set_attrib_data(gl, program, {attrib_name: "aVertexPosition", buffer_id: circle_instance_vbo}, 2, gl.FLOAT);
        set_attrib_data_instanced(gl, program, {attrib_name: "aVertexOffset", buffer_id: this.node_offset_vbo}, 3, gl.FLOAT);

        const u_res_status = quick_uniform(gl, program, "uResolution2D", (gl, loc) => gl.uniform2f(loc, gl.canvas.width, gl.canvas.height));
        const u_rad_status = quick_uniform(gl, program, "uNodeRadius", (gl, loc) => gl.uniform1f(loc, this.node_circle_radius));
        return u_res_status && u_rad_status;
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
        this.edge_offset_vbo = buffer_init_empty(gl, gl.STATIC_DRAW);

        set_attrib_data(gl, program, {attrib_name: "aVertexPosition", buffer_id: line_instance_vbo}, 3, gl.FLOAT);
        set_attrib_data_instanced(gl, program, {attrib_name: "aEdgeOffsets", buffer_id: this.edge_offset_vbo}, 4, gl.FLOAT, false, 20);
        set_attrib_data_instanced(gl, program, {attrib_name: "aEdgeID", buffer_id: this.edge_offset_vbo}, 1, gl.FLOAT, false, 20, 20);

        const u_res_status = quick_uniform(gl, program, "uResolution2D", (gl, loc) => gl.uniform2f(loc, gl.canvas.width, gl.canvas.height));
        const u_gir_status = quick_uniform(gl, program, "uEdgeGirth", (gl, loc) => gl.uniform1f(loc, this.edge_line_girth));
        return u_res_status && u_gir_status;
    }

    constructor(gl: WebGL2RenderingContext, input_graph: G, node_radius: number = 5, edge_girth: number = 5) {
        this.topology = input_graph;
        this.dirty_nodes = false;
        this.dirty_edges = false;
        this.node_circle_radius = node_radius;
        this.edge_line_girth = edge_girth;

        const node_program: WebGLProgram | null = init_shader_program(gl, NODE_VS_SHADER, NODE_FS_SHADER);
        if (node_program === null) {
            console.error("Error while initializing Node shader program");
            return;
        }

        const edge_program: WebGLProgram | null = init_shader_program(gl, EDGE_VS_SHADER, EDGE_FS_SHADER);
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