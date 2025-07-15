import { kGraph } from "./graph_utility/KGraph";
import type { vec2 } from "gl-matrix";
import { init_shader_program } from "./shader_utility/shader_funcs";
import { render_graph_vs_text, render_graph_fs_text } from "./shader_utility/shader_strings";

/** Quick coupling of number of nodes & number of edges together */
type GraphSize = { num_nodes: number, num_edges: number };

/** Function that takes in graph G and returns graph G'. The mapping function must preserve the graph types N and E */
type GraphMap<N,E> = (G: kGraph<N,E>) => kGraph<N,E>;

/** Tracks node position, name, and other relevant data (tbd) */
export type MetaNode = {
    position: vec2,
    name: string
}

export function metanode_build(x: number, y: number, name: string): MetaNode {
    return {
        position: [x, y],
        name: name
    };
}

export class RenderGraph {
    private topology: kGraph<MetaNode,string>;
    private program: WebGLProgram;
    
    private vao: WebGLVertexArrayObject;
    private vbo: WebGLBuffer;
    private ebo: WebGLBuffer;

    private dirty_nodes: boolean;
    private dirty_edges: boolean;

    constructor(gl: WebGL2RenderingContext) {
        this.topology = new kGraph<MetaNode,string>();
        this.dirty_nodes = false;
        this.dirty_edges = false;

        this.program = init_shader_program(gl, render_graph_vs_text, render_graph_fs_text)!;
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        const aVPos: number = gl.getAttribLocation(this.program, "aVertexPosition");
        
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);

        gl.vertexAttribPointer(
            aVPos,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.enableVertexAttribArray(aVPos);
    }

    private build_vertices(gl: WebGL2RenderingContext) {
        const positions: Float32Array = new Float32Array(this.topology.num_nodes() * 2);
        for (let n = 0; n < this.topology.num_nodes(); n++) {
            const M: MetaNode = this.topology.node_weight(n);
            const buffer_idx: number = n * 2;

            positions[buffer_idx] = M.position[0];
            positions[buffer_idx + 1] = M.position[1];
        }

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        console.log("Vertices: ", positions);
    }

    private build_edges(gl: WebGL2RenderingContext) {
        const indices: number[] = [];

        for (let e = 0; e < this.topology.num_edges(); e++) {
            const L = this.topology.edge_nodes(e);
            indices.push(L.from_node);
            indices.push(L.to_node);
        }

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
    }

    /** Exposes the internal graph of the RenderGraph and updates the dirty field if a change in the number of edges or nodes is observed*/
    public update(M: GraphMap<MetaNode,string>): RenderGraph {
        const prev_size: GraphSize = { num_nodes: this.topology.num_nodes(), num_edges: this.topology.num_edges() };
        this.topology = M(this.topology);
        this.dirty_nodes = prev_size.num_nodes !== this.topology.num_nodes();
        this.dirty_edges = prev_size.num_edges !== this.topology.num_edges();
        return this;
    }

    public peek(M: (g: Readonly<kGraph<MetaNode,string>>) => void): RenderGraph {
        M(this.topology);
        return this;
    };

    public is_dirty() {
        return this.dirty_edges || this.dirty_nodes;
    }

    /** Draws this RenderGraph */
    public draw(gl: WebGL2RenderingContext) {

        if (this.dirty_nodes) {
            // UPDATE VERTICES
            this.dirty_nodes = false;
            this.build_vertices(gl);
        }

        if (this.dirty_edges) {
            // UPDATE EDGES
            this.dirty_edges = false;
            this.build_edges(gl);
        }

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.POINTS, 0, this.topology.num_nodes());
        gl.drawElements(gl.LINES, this.topology.num_edges() * 2, gl.UNSIGNED_INT, 0);
    }
}