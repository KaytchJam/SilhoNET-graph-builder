import type { Positionable } from "../../utils/types/Positionable";
import { RenderGraph } from "./GraphRenderer";
import { MetaGraph } from "./metagraph/MetaGraph";
import { type IndexedGraph } from "./metagraph/KGraph";
import { TexturePlane } from "./gui/TexturePlane";
import { MouseTracker } from "./gui/MouseTracker";

import { vec2 } from "gl-matrix"
import { ClickEnum, get_lc_states, type TClickEnum } from "./UIStates";

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

/** Wrapper for the vec2 type that has support w/ Positionable */
export class PVec2 implements Positionable {
    vec: vec2;

    constructor(x: number = 0, y: number = 0) {
        this.vec = new Float32Array([x, y]);
    }

    get_x(): number { return this.vec[0]; }
    get_y(): number { return this.vec[1]; }
    get_xy(): [number, number] { return [this.vec[0], this.vec[1]]; }

    set_x(x: number): void { this.vec[0] = x; }
    set_y(y: number): void { this.vec[1] = y; };
    set_xy(x: number, y: number): void { this.vec[0] = x; this.vec[1] = y; }

    as_vec(): vec2 { return this.vec; }
}

type PositionableTarget = Coord2D;
type PositionableMG = MetaGraph<PositionableTarget,void>;
type RGraphWrapper<G extends IndexedGraph<Coord2D, any>> = RenderGraph<PositionableTarget, G>;

type UpdateCallback = (selected_node: number | null) => void;

export class GraphEngine {
    // rendering context
    private m_context: WebGL2RenderingContext | undefined;

    // interaction related states + callbacks
    private m_mouse_pos_cback: Coord2D;
    private m_left_clicked_cback: boolean;

    private m_mouse_pos: vec2;
    private m_left_clicked: boolean;
    private m_selected_node: number | null;
    private m_prev_left_click_state: TClickEnum;

    // drawables & data structures (all rely on a valid rendering context)
    private m_graph: RGraphWrapper<PositionableMG> | undefined;
    private m_plane: TexturePlane | undefined;
    private m_tracker: MouseTracker | undefined;

    private m_update_callbacks: UpdateCallback[] = [];

    // other
    private static S_NODE_RADIUS: number = 5.0;
    private static S_EDGE_GIRTH: number = 2.0;
    
    /** Private constructor, forcing construction through the static method */
    private constructor() {
        this.m_mouse_pos_cback = new Coord2D(0,0);
        this.m_mouse_pos = [0.0, 0.0];
        this.m_left_clicked = false;
        this.m_left_clicked_cback = false;
        this.m_selected_node = null;
        this.m_prev_left_click_state = ClickEnum.NONE;
    }

    public add_update_callback(uc: UpdateCallback): void {
        this.m_update_callbacks.push(uc);
    }

    /** Attach callbacks associated with `engine` to the input HTMLCanvasElement */
    private static attach_callbacks(engine: GraphEngine, canvas: HTMLCanvasElement): void {
        const mouse_callback = (event: MouseEvent) => {
            const bb: DOMRect = canvas.getBoundingClientRect();
            engine.m_mouse_pos_cback.set_xy(
                event.clientX - bb.left,
                event.clientY - bb.top
            );
        }

        const left_click_down_callback = (event: MouseEvent) => {
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

        const left_click_up_callback = (event: MouseEvent) => {
            switch (event.button) {
                case 0: // LEFT CLICK
                    engine.m_left_clicked_cback = false;
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
        canvas.addEventListener("mousedown", left_click_down_callback);
        canvas.addEventListener("mouseup", left_click_up_callback);
        canvas.addEventListener("keyup", esc_callback);
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
        engine.m_graph = new RenderGraph(engine.m_context, new MetaGraph(), GraphEngine.S_NODE_RADIUS, GraphEngine.S_EDGE_GIRTH);
        engine.m_tracker = new MouseTracker(engine.m_context);

        if (txt_img !== undefined) {
            engine.m_plane = new TexturePlane(engine.m_context, txt_img);
        }
        
        // Callback setup & insertion of fixed attributes
        GraphEngine.attach_callbacks(engine, canvas);
        engine.m_graph.expose_graph().add_attr("Name", false);

        return engine;
    }

    public add_attribute(attribute_name: string, removable: boolean): void {
        this.m_graph!.expose_graph().add_attr(attribute_name, removable);
    }

    public remove_attribute(attribute_name: string): void {
        this.m_graph!.expose_graph().remove_attr_forced(attribute_name);
    }

    public is_removeable(attribute_name: string): boolean {
        return this.m_graph!.expose_graph().is_attr_removable(attribute_name);
    }

    public contains(attr: string) {
        return this.m_graph!.expose_graph().has_attr(attr);
    }

    public num_attributes(): number {
        return this.m_graph!.expose_graph().num_attrs();
    }

    public get_node_attr_value(attr_name: string, node: number): string | null {
        return this.expose_graph().expose_graph().node_attr(attr_name, node);
    }

    public update_node_attr_value(attr_name: string, node: number, value: string): void {
        const meta: PositionableMG = this.expose_graph().expose_graph();
        meta.set_node_value(node, attr_name, value);
    }

    public iter_attributes(): MapIterator<string> {
        return this.m_graph!.expose_graph().iter_keys();
    }

    /** Expose the render graph used by the GraphEngine */
    public expose_graph(): Readonly<RGraphWrapper<PositionableMG>> {
        return this.m_graph!;
    }

    /** Returns the current selected node. If no node is currently selected 
     * then -1 is returned. */
    public get_selected(): number {
        return this.m_selected_node ? this.m_selected_node : -1;
    }

    /** Update the current image/texture bound to the internal "m_plane" of the GraphEngine. */
    public set_background_image(img?: HTMLImageElement | undefined): void {
        if (img === undefined) {
            this.m_plane = undefined;
            return;
        }

        if (this.m_plane !== undefined) {
            this.m_plane.free(this.m_context!);
        }

        this.m_plane = new TexturePlane(this.m_context!, img);
    }

    /** Find the nearest Graph node to the user's mouse within a given threshold. */
    public select(mouse_pos: vec2, flexibility: number = 2.0): number | null {
        const thresh: number = GraphEngine.S_NODE_RADIUS + flexibility;
        const thresh_sqred: number = thresh * thresh;
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

    /** Handles the "add_node" event of the GraphEngine. */
    private add_node(): void {
        this.m_graph!.peek_mut((g: PositionableMG): PositionableMG => {
            g.add_node(Coord2D.from_vec2(this.m_mouse_pos));
            return g;
        });

        this.m_selected_node = null;
    }

    /** Handles the "add_edge" event of the GraphEngine. */
    private add_edge(hover_node: number): void {
        const g: RGraphWrapper<PositionableMG> = this.m_graph!;
        const node_picked: number = this.m_selected_node!;

        console.log("Selected node: ", this.m_selected_node);

        if (!g.expose_graph().inner().has_directed_wiff(node_picked, hover_node)) {
            g.peek_mut((mg: PositionableMG): PositionableMG => {
                mg.add_edge(node_picked, hover_node);
                return mg;
            });
        }
    }

    /** Update the x-y value of a given node */
    private move_node(node_idx: number): void {
        const rg: RGraphWrapper<PositionableMG>= this.m_graph!;
        rg.peek((g: Readonly<PositionableMG>) => { 
            g.node_weight(node_idx).set_xy(this.m_mouse_pos[0], this.m_mouse_pos[1]); 
        });

        rg.make_nodes_dirty();
        rg.make_edges_dirty();
    }

    /** Helper function to prevent "double clicking" due to holding the left click button. Resets
     * both m_left_clicked && m_left_clicked_cback to false */
    private clear_left_click_states() {
        this.m_left_clicked = false;
        this.m_left_clicked_cback = false;
    }

    /** Double check the state recieved from 'get_lc_states' and change it last minute if necessary */
    private state_swerve(lc_state: TClickEnum, hov_node: number | null): TClickEnum {
        if (lc_state == ClickEnum.LC_ADD_EDGE && this.m_graph!.expose_graph().inner().has_directed_wiff(this.m_selected_node!, hov_node!)) {
            lc_state = ClickEnum.LC_SELECT_NODE;
        }
        return lc_state;
    }

    /** Handler for left click related events */
    private left_click_update(hover_node: number | null, prev_lc: boolean, prev_lc_state: TClickEnum): TClickEnum {
        let state_out: TClickEnum = get_lc_states({ node_picked: this.m_selected_node, hover_node, prev_lc, prev_state: prev_lc_state});
        state_out = this.state_swerve(state_out, hover_node); // last minute state update

        switch (state_out) {
            case ClickEnum.LC_ADD_NODE:
                this.add_node();
                this.clear_left_click_states();
                break;
            case ClickEnum.LC_ADD_EDGE:
                this.add_edge(hover_node!);
                this.clear_left_click_states();
                break;
            case ClickEnum.LC_SELECT_NODE:
                this.m_selected_node = hover_node!;
                break;
            case ClickEnum.LC_DESELECT_NODE:
                this.m_selected_node = null;
                this.clear_left_click_states();
                break;
            case ClickEnum.LC_MOVE_NODE_START:
                break;
            case ClickEnum.LC_MOVE_NODE:
                this.move_node(this.m_selected_node!);
                break;
            default:
                break;
        }
        return state_out;
    }

    /** Update variables before the next render-call */
    public update(prev_time: DOMHighResTimeStamp, cur_time: DOMHighResTimeStamp): void {
        const gl: WebGL2RenderingContext = this.m_context!;
        const dt: DOMHighResTimeStamp = (cur_time - prev_time) / 16.67; // ( 1000 frames / 60 frames ) * 1 second

        // pass on values of our "callback-variables" to "local versions" in update to prevent modification
        this.m_mouse_pos[0] = this.m_mouse_pos_cback.get_x();
        this.m_mouse_pos[1] = this.m_mouse_pos_cback.get_y();

        const prev_lc: boolean = this.m_left_clicked;
        this.m_left_clicked = this.m_left_clicked_cback;

        // are we "over" any particular node?
        const prev_selected = this.m_selected_node;
        const hover_node: number | null = this.select(this.m_mouse_pos);
        if (this.m_left_clicked) { 
            this.m_prev_left_click_state = this.left_click_update(hover_node, prev_lc, this.m_prev_left_click_state); 
        }

        this.m_tracker!.update_position(this.m_mouse_pos);
        this.m_graph!.set_hover_node(gl, hover_node !== null ? hover_node : -1);
        this.m_graph!.set_select_node(gl, this.m_selected_node !== null ? this.m_selected_node : -1);

        // signal all update callbacks
        for (let uc of this.m_update_callbacks) {
            uc(this.m_selected_node);
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

        if (this.m_plane !== undefined) { this.m_plane!.draw(gl); }
        this.m_graph!.draw(gl);
        this.m_tracker!.draw(gl);
    }
}