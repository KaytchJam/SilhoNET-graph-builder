import type { Positionable } from "../../utils/types/Positionable";
import { RenderGraph } from "./GraphRenderer";
import { MetaGraph } from "./metagraph/MetaGraph";
import { type IndexedGraph } from "./metagraph/KGraph";
import { TexturePlane } from "./gui/TexturePlane";
import { MouseTracker } from "./gui/MouseTracker";

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
    private mr_context: WebGL2RenderingContext | undefined;

    // interaction states
    private ms_mouse_pos: Coord2D;
    private ms_left_clicked: boolean;
    private ms_selected_node: number | null;

    // drawables & data structures (all rely on a valid rendering context)
    private md_graph: Coord2DRenderGraph<MetaGraph<Coord2D, void>> | undefined;
    private md_plane: TexturePlane | undefined;
    private md_tracker: MouseTracker | undefined;
    
    /** Private constructor, forcing construction through the static method */
    private constructor() {
        this.ms_mouse_pos = new Coord2D(0,0);
        this.ms_left_clicked = false;
        this.ms_selected_node = null;
    }

    /** Static factory for the GraphEngine. Relieves the constructor of having to deal with
     * the undefined data members. Either returns a fully constructed `GraphEngine` or `null` if
     * an error occurs while determining the graph context. */
    public static build(canvas: HTMLCanvasElement, txt_img: HTMLImageElement): GraphEngine | null {
        const engine: GraphEngine = new GraphEngine();
        const ctxt: WebGL2RenderingContext | null = canvas.getContext("webgl2");

        if (ctxt === null) {
            console.error("Was unable to instantiate a WebGL2RenderingConext from the input HTMLCanvasElement.");
            return null;
        }

        engine.mr_context = ctxt;
        engine.md_graph = new RenderGraph(engine.mr_context, new MetaGraph());
        engine.md_tracker = new MouseTracker(engine.mr_context);
        engine.md_plane = new TexturePlane(engine.mr_context, txt_img);

        return engine;
    }

    /** Draw all the important things for our engine */
    public draw(): void {
        const gl: WebGL2RenderingContext = this.mr_context!;

        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1.0);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.md_plane!.draw(gl);
        this.md_graph!.draw(gl);
        this.md_tracker!.draw(gl);
    }

    // public update() {

    // }
}