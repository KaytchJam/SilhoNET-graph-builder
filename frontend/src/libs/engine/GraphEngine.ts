import type { Positionable } from "../../utils/types/Positionable";
import { RenderGraph } from "./GraphRenderer";
import { MetaGraph } from "./metagraph/MetaGraph";
import { type IndexedGraph } from "./metagraph/KGraph";
import { TexturePlane } from "./gui/TexturePlane";
import { MouseTracker } from "./gui/MouseTracker";

import { type vec2 } from "gl-matrix"

export class Coord2D implements Positionable {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    static from(arr: [number, number]): Coord2D { return new Coord2D(arr[0], arr[1]); }
    static from_coord(other: Coord2D): Coord2D { return new Coord2D(other.x, other.y); }
    static from_pos<P extends Positionable>(other: P): Coord2D { return new Coord2D(other.get_x(), other.get_y()); }

    get_x(): number { return this.x; }
    get_y(): number { return this.y; }
    get_xy(): [number, number] { return [this.x, this.y]; }

    set_x(x: number): void { this.x = x; }
    set_y(y: number): void { this.y = y; };
    set_xy(x: number, y: number): void { this.x = x; this.y = y; }
}

type Coord2DRenderGraph<G extends IndexedGraph<Coord2D, any>> = RenderGraph<Coord2D, G>;

export class GraphEngine {
    // rendering context
    private m_context: WebGL2RenderingContext | undefined;

    // interaction states
    private m_mouse_pos: Coord2D;
    private m_left_clicked: boolean;
    private m_selected_node: number | null;

    // drawables & data structures (all rely on a valid rendering context)
    private m_graph: Coord2DRenderGraph<MetaGraph<Coord2D, void>> | undefined;
    private m_plane: TexturePlane | undefined;
    private m_tracker: MouseTracker | undefined;
    
    /** Private constructor, forcing construction through the static method */
    private constructor() {
        this.m_mouse_pos = new Coord2D(0,0);
        this.m_left_clicked = false;
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
        engine.m_graph = new RenderGraph(engine.m_context, new MetaGraph());
        engine.m_tracker = new MouseTracker(engine.m_context);

        if (txt_img !== undefined) {
            engine.m_plane = new TexturePlane(engine.m_context, txt_img);
        }

        const mouse_callback = (event: MouseEvent) => {
            const bb: DOMRect = canvas.getBoundingClientRect();
            engine.m_mouse_pos.set_xy(
                event.clientX - bb.left,
                event.clientY - bb.top
            );
        }

        const left_click_callback = (event: MouseEvent) => {
            switch (event.button) {
                case 0: // LEFT CLICK
                    engine.m_left_clicked = true;
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

    public update(prev_time: DOMHighResTimeStamp, cur_time: DOMHighResTimeStamp) {
        const gl = this.m_context!;
        const dt = (cur_time - prev_time) / 16.67;

        // local instances of our "callback-variables" in update to prevent modification
        const mouse_position: vec2 = this.m_mouse_pos.get_xy();
        const left_clicked: boolean = this.m_left_clicked;
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