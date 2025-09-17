import type { Positionable } from "../../utils/types/Positionable";
import { RenderGraph } from "./GraphRenderer";
import { MetaGraph } from "./metagraph/MetaGraph";
import { type IndexedGraph } from "./metagraph/KGraph";
import { TexturePlane } from "./gui/TexturePlane";
import { MouseTracker } from "./gui/MouseTracker";

import { vec2 } from "gl-matrix"
import { ClickEnum, get_lc_states } from "./UIStates";

export class Coord2D implements Positionable {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    static from(arr: [number, number]): Coord2D { return new Coord2D(arr[0], arr[1]); }
    static from_vec2(arr: vec2): Coord2D { return new Coord2D(arr[0], arr[1]); }
    static from_coord(other: Coord2D): Coord2D { return new Coord2D(other.x, other.y); }
    static from_pos<P extends Positionable>(other: P): Coord2D { return new Coord2D(other.get_x(), other.get_y()); }

    get_x(): number { return this.x; }
    get_y(): number { return this.y; }
    get_xy(): [number, number] { return [this.x, this.y]; }

    set_x(x: number): void { this.x = x; }
    set_y(y: number): void { this.y = y; };
    set_xy(x: number, y: number): void { this.x = x; this.y = y; }
}

// type pvec2 = Coord2D & vec2;

type CoordMG = MetaGraph<Coord2D,void>;
type CoordRG<G extends IndexedGraph<Coord2D, any>> = RenderGraph<Coord2D, G>;

export class GraphEngine {
    // rendering context
    private m_context: WebGL2RenderingContext | undefined;

    // interaction related states + callbacks
    private m_mouse_pos_cback: Coord2D;
    private m_left_clicked_cback: boolean;

    private m_mouse_pos: vec2;
    private m_left_clicked: boolean;
    private m_selected_node: number | null;

    // drawables & data structures (all rely on a valid rendering context)
    private m_graph: CoordRG<CoordMG> | undefined;
    private m_plane: TexturePlane | undefined;
    private m_tracker: MouseTracker | undefined;

    // other
    private static s_node_radius: number = 5;
    private static s_edge_girth: number = 5;
    
    /** Private constructor, forcing construction through the static method */
    private constructor() {
        this.m_mouse_pos_cback = new Coord2D(0,0);
        this.m_mouse_pos = [0.0, 0.0];
        this.m_left_clicked = false;
        this.m_left_clicked_cback = false;
        this.m_selected_node = null;
    }

    /** Static factory for the GraphEngine. Relieves the constructor of having to deal with
     * the undefined data members. Either returns a fully constructed `GraphEngine` or `null` if
     * an error occurs while determining the graph context. */
    public static build(canvas: HTMLCanvasElement, txt_img?: HTMLImageElement | undefined): GraphEngine | null {
        const engine: GraphEngine = new GraphEngine();
        const ctxt: WebGL2RenderingContext | null = canvas.getContext("webgl2");

        if (ctxt === null) {
            console.error("Was unable to instantiate a WebGL2RenderingConext from the input HTMLCanvasElement.");
            return null;
        }

        engine.m_context = ctxt;
        engine.m_graph = new RenderGraph(engine.m_context, new MetaGraph(), GraphEngine.s_node_radius, GraphEngine.s_edge_girth);
        engine.m_tracker = new MouseTracker(engine.m_context);

        if (txt_img !== undefined) {
            engine.m_plane = new TexturePlane(engine.m_context, txt_img);
        }

        const mouse_callback = (event: MouseEvent) => {
            const bb: DOMRect = canvas.getBoundingClientRect();
            engine.m_mouse_pos_cback.set_xy(
                event.clientX - bb.left,
                event.clientY - bb.top
            );
        }

        const left_click_callback = (event: MouseEvent) => {
            switch (event.button) {
                case 0: // LEFT CLICK
                    engine.m_left_clicked_cback = true;
                    break;
                case 1: // RIGHT CLICK
                    break;
                default: // IDC
                    break;
            }
        }

        const esc_callback = (event: KeyboardEvent) => {
            if (event.code == "Escape") {
                engine.m_selected_node = null;
            }
        }

        canvas.addEventListener("mousemove", mouse_callback);
        canvas.addEventListener("mouseup", left_click_callback);
        canvas.addEventListener("keyup", esc_callback);

        return engine;
    }

    /** Find the nearest Graph node to the user's mouse within a given threshold. */
    public select(mouse_pos: vec2): number | null {
        const thresh_sqred: number = GraphEngine.s_node_radius * GraphEngine.s_node_radius;
        let match: number = -1;
        let match_dist_sqrd: number = Number.POSITIVE_INFINITY;
        let node_pos: vec2 = [0.0, 0.0];
    
        this.m_graph!.peek((g: Readonly<MetaGraph<Coord2D, void>>): void => {
            for (let i = 0; i < g.num_nodes(); i++) {
                const node_coord: Coord2D = g.node_weight(i);
                node_pos[0] = node_coord.get_x();
                node_pos[1] = node_coord.get_y();
                
                const dist_sqrd: number = vec2.sqrDist(mouse_pos, node_pos);
                if (dist_sqrd < thresh_sqred && dist_sqrd < match_dist_sqrd) {
                    match = i;
                    match_dist_sqrd = dist_sqrd;
                }
            }
        });
    
        return match === -1 ? null : match;
    }

    private add_node(): void {
        this.m_graph!.peek_mut((g: CoordMG): CoordMG => {
            g.add_node(Coord2D.from_vec2(this.m_mouse_pos));
            return g;
        });

        this.m_selected_node = null;
    }

    private add_edge(): void {

    }

    private left_click_update(hover_node: number | null): void {
        switch (get_lc_states({ node_picked: this.m_selected_node, hover_node})) {
            case ClickEnum.LC_ADD_NODE:
                break;
            case ClickEnum.LC_ADD_EDGE:
                break;
            case ClickEnum.LC_SELECT_NODE:
                break;
            case ClickEnum.LC_DESELECT_NODE:
                break;
        }
    }

    public update(prev_time: DOMHighResTimeStamp, cur_time: DOMHighResTimeStamp) {
        const gl: WebGL2RenderingContext = this.m_context!;
        const dt: DOMHighResTimeStamp = (cur_time - prev_time) / 16.67;

        // pass on values of our "callback-variables" to "local versions" in update to prevent modification
        this.m_mouse_pos[0] = this.m_mouse_pos_cback.get_x();
        this.m_mouse_pos[1] = this.m_mouse_pos_cback.get_y();
        this.m_left_clicked = this.m_left_clicked_cback;

        // are we "over" any particular node?
        const hover_node: number | null = this.select(this.m_mouse_pos);
        if (this.m_left_clicked) {
            this.left_click_update(hover_node);
        }
    }

    /** Draw all the important things for our engine */
    public draw(): void {
        const gl: WebGL2RenderingContext = this.m_context!;

        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1.0);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (this.m_plane) { this.m_plane!.draw(gl); }
        this.m_graph!.draw(gl);
        this.m_tracker!.draw(gl);
    }
}