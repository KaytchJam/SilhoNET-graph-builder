import React from "react"
import { vec2 } from "gl-matrix";
import { TexturePlane } from "../utility/TexturePlane";
import { kGraph, type node_idx_t } from "../utility/graph_utility/KGraph";
import { RenderGraph, metanode_build, type MetaNode } from "../utility/RenderGraph";
import { ClickEnum, get_lc_states, type TClickEnum } from "../utility/UIStates";
import { type GraphExporter, GraphMLExporter, DotExporter } from "../utility/ExportGraph";
import { MouseTracker } from "../utility/MouseTracker";

// Convert "image" File types into HTMLImageElements
function file_to_image(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader: FileReader = new FileReader();

    reader.onload = () => {
      if (reader.result) {
        const img: HTMLImageElement = new Image();
        img.src = reader.result as string;

        img.onload = () => resolve(img);
        img.onerror = (error) => reject(error);
      } else {
        reject(new Error("File could not be read."));
      }
    };

    reader.onerror = () => reject(new Error("Error reading file."));
    reader.readAsDataURL(file);
  });
}

async function accept_file(f: FormData, setter: React.Dispatch<React.SetStateAction<HTMLImageElement|null>>): Promise<void> {
    const input_file: FormDataEntryValue | null = f.get("image-input");
    if (input_file) {
        const input_image: HTMLImageElement = await file_to_image(input_file as File);
        setter(input_image);
    }
}

function draw_scene(gl: WebGL2RenderingContext, tp: TexturePlane, rg: RenderGraph, tr: MouseTracker) {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clearDepth(1.0);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    tp.draw(gl);
    rg.draw(gl);
    tr.draw(gl);
}

/** Find the nearest Graph node to the user's mouse within a given threshold. */
function select(pos: Readonly<vec2>, rg: RenderGraph, thresh: number = 5.0): node_idx_t | null {
    const thresh_sqred: number = thresh * thresh;
    let match: number = -1;
    let match_dist_sqrd: number = Number.POSITIVE_INFINITY;

    rg.peek((g: Readonly<kGraph<MetaNode, string>>): void => {
        for (let i = 0; i < g.num_nodes(); i++) {
            const node_pos: vec2 = g.node_weight(i).position;
            const dist_sqrd: number = vec2.sqrDist(pos, node_pos);

            if (dist_sqrd < thresh_sqred && dist_sqrd < match_dist_sqrd) {
                match = i;
                match_dist_sqrd = dist_sqrd;
            }
        }
    });

    return match === -1 ? null : match;
}

// type EventBus = {
//     mouse_position: vec2;
//     left_click: boolean;
// }

function WebGLCanvas(bg: { image_input: HTMLImageElement }): React.JSX.Element {
    const canvas_ref = React.useRef<HTMLCanvasElement>(null);
    const para_ref = React.useRef<HTMLParagraphElement>(null);

    const mouse_pos = React.useRef<vec2>([0, 0]);
    const rgraph = React.useRef<RenderGraph>(null);
    const left_click = React.useRef<boolean>(false);
    const selected_node = React.useRef<node_idx_t>(null);
    const [exportFormat, setExportFormat] = React.useState<"graphml" | "dot">("graphml");

    // need a graph data structure internally
    const img_in: HTMLImageElement = bg.image_input;

    const handleExport = () => {
        const rg = rgraph.current;
        if (!rg) return;

        const graph: kGraph<MetaNode,string> = rg.expose_graph();

        let exporter: GraphExporter;
        switch (exportFormat) {
            case "graphml":
                exporter = new GraphMLExporter();
                break;
            case "dot":
                exporter = new DotExporter();
                break;
            default:
                console.error("Unsupported format");
                return;
        }

        const output = exporter.serialize(graph); // assumes this returns a string
        const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `graph_export.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    React.useEffect(() => {
        const canvas: HTMLCanvasElement | null = canvas_ref.current;

        if (canvas == null) {
            console.error("Couldn't find canvas reference");
            return;
        }

        canvas.addEventListener("mousemove", (event: MouseEvent) => {
            const bb: DOMRect = canvas_ref.current?.getBoundingClientRect()!;
            mouse_pos.current = [
                event.clientX - bb.left,
                event.clientY - bb.top
            ];
        });

        canvas.addEventListener("mouseup", (ev: MouseEvent) => {
            switch (ev.button) {
                case 0: // LEFT CLICK
                    left_click.current = true;
                    break;
                case 1: // RIGHT CLICK
                    console.log("Right click happened over canvas");
                    break;
                default: // IDK
                    break;
            }
        });
    }, []);

    React.useEffect(() => {
        const canvas: HTMLCanvasElement | null = canvas_ref.current;
        const para: HTMLParagraphElement | null = para_ref.current;

        if (canvas == null) {
            console.error("Couldn't find a canvas reference");
            return;
        }
        
        const gl: WebGL2RenderingContext | null = canvas.getContext("webgl2");
        
        if (!gl) {
            console.error('WebGL2 not supported');
            return;
        }

        const tplane: TexturePlane = new TexturePlane(canvas, gl, img_in);
        const tracker: MouseTracker = new MouseTracker(gl);
        rgraph.current = new RenderGraph(gl);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Render loop
        const render_loop = (_: number) => {
            // copying all "asyncs" at the start of the render loop
            const rg: RenderGraph = rgraph.current!;
            const node_picked: number | null = selected_node.current;
            const m_pos: number[] | Float32Array = mouse_pos.current.slice();
            const l_clicked: boolean = left_click.current;
            const hover_node: number | null = select(m_pos as vec2, rg, 8.0);
            tracker.update_position([m_pos[0], m_pos[1]]);

            if (l_clicked) {
                const lc_state: TClickEnum = get_lc_states({ node_picked, hover_node });

                switch (lc_state) {
                    case ClickEnum.LC_ADD_NODE:
                        rg.update((g: kGraph<MetaNode, string>): kGraph<MetaNode,string> => {
                            const m_new: MetaNode = metanode_build(m_pos[0], m_pos[1], "");
                            g.add_node(m_new);
                            return g;
                        });
                        selected_node.current = null;
                        break;

                    case ClickEnum.LC_ADD_EDGE:
                        if (!rg.expose_graph().has_outgoing_to(node_picked!, hover_node!)) {
                            rg.update((g: kGraph<MetaNode,string>): kGraph<MetaNode,string> => {
                                g.add_edge(node_picked!, hover_node!, "");
                                return g;
                            });
                        }
                        selected_node.current = null;
                        break;

                    case ClickEnum.LC_SELECT_NODE:
                        selected_node.current = hover_node;
                        break;

                    case ClickEnum.LC_DESELECT_NODE:
                        selected_node.current = null;
                        break;

                    default:
                        break;
                }

                left_click.current = false;
            }

            para!.textContent = `Selected node: ${ node_picked === null ? "NONE" : node_picked }`;

            draw_scene(gl, tplane, rg, tracker);
            requestAnimationFrame(render_loop);
        }

        requestAnimationFrame(render_loop);
    }, [img_in]);

    return (
        <div>
            <p>Another canvas, with a texture now.</p>
            <canvas ref={canvas_ref} height="400" width="600"></canvas>
            <p ref={para_ref}></p>
            <div>
                <label>Export format: </label>
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)}>
                    <option value="graphml">GraphML</option>
                    <option value="dot">DOT</option>
                </select>
                <button onClick={handleExport}>Export Graph</button>
            </div>
        </div>
    );
}

// TODO:
// NEED... A CANVAS
// NEED... TO BE ABLE TO PUT TEXTURES ON THE CANVAS
// NEED... TO BE ABLE TO "DRAW" POINTS AND LINES ON THE CANVAS -> CONSTRUCT GRAPH

export default function WebGLComponentTwo(): React.JSX.Element {
    const [image_in, set_image_in] = React.useState<HTMLImageElement | null>(null);

    return (
        <div>
            <p>Some text some text ya feeeeel me</p>

            <form action={(f: FormData) => accept_file(f, set_image_in)}>
                <input type="file" accept="image/jpeg" name="image-input"required/>
                <button type="submit" name="image-submit">Create Canvas</button>
            </form>
            { image_in && <WebGLCanvas image_input={image_in}/> }
        </div>
    );
}