import React from "react"
import { vec2 } from "gl-matrix";
import { TexturePlane } from "../utility/TexturePlane";
import { kGraph, type node_idx_t } from "../utility/graph_utility/KGraph";
import { RenderGraph, drawnode_build, type DrawNode } from "../utility/RenderGraph";
import { ClickEnum, get_lc_states, type TClickEnum } from "../utility/UIStates";
import { type MetaGraphExporter, GraphMLExporter, DOTExporter } from "../utility/ExportGraph";
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

    rg.peek((g: Readonly<kGraph<DrawNode, string>>): void => {
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

// basic bare bone necessities of the Metacard (witholding adding attributes)

// #1 knowledge of the "SelectedNode" state
// -> is a node currently being selected
// -> WHICH node is currently being selected

// #2 ability to update the graph
// -> pass in a "node_weight_update" function to the component
// -> node_weight_update(n: node_idx_t, weight: N) where n is the node we want to update and weight is the new weight

type MetaCardInput = {
    selected_node: number | null;
    metadata_map: Map<string,string[]>
}

/** React componenet for rendering 'node' cards or 'key' cards
 *
 * 
 *  -> Key Cards: Add or remove node attributes
 *  -> Node cards: Edit a selected node's particular attributes
 */
function MetadataCard(meta_in: MetaCardInput) {
    const update_metadata = (n: node_idx_t) => { n };
    const node_index: node_idx_t = meta_in.selected_node!;

   return (
        <div className="meta-card-div">
            <h4>Node Metadata</h4>
            <label>Name: <input type="text" value="" name="node-name-input" onChange={() => { update_metadata(node_index) }}/></label>
        </div>
   );
}

function init_metadata_map() {
    const metamap = new Map<string,string[]>();
    metamap.set("name", []);
    // metamap.set("")
    return metamap;
}

function append_to_all(metadata_map: Map<string,string[]>) {
    for (let [_, value] of metadata_map) { value.push(""); }
    return metadata_map;
}

function WebGLCanvas(bg: { image_input: HTMLImageElement }): React.JSX.Element {
    const canvas_ref = React.useRef<HTMLCanvasElement>(null);
    const para_ref = React.useRef<HTMLParagraphElement>(null);

    const mouse_pos = React.useRef<vec2>([0, 0]);
    const rgraph = React.useRef<RenderGraph>(null);
    const mmap = React.useRef(init_metadata_map());
    const left_click = React.useRef<boolean>(false);
    const selected_node = React.useRef<node_idx_t>(null);
    const [exportFormat, setExportFormat] = React.useState<"graphml" | "gv">("graphml");

    // need a graph data structure internally
    const img_in: HTMLImageElement = bg.image_input;

    const handleExport = () => {
        const rg: RenderGraph | null = rgraph.current;
        const mm: Map<string,string[]> = mmap.current;
        if (!rg) return;

        const graph: kGraph<DrawNode,string> = rg.expose_graph();

        let exporter: MetaGraphExporter;
        switch (exportFormat) {
            case "graphml":
                exporter = new GraphMLExporter();
                break;
            case "gv":
                exporter = new DOTExporter();
                break;
            default:
                console.error("Unsupported format");
                return;
        }

        const output: string = exporter.serialize(graph, mm); // assumes this returns a string
        const blob: Blob = new Blob([output], { type: "text/plain;charset=utf-8" });
        const url: string = URL.createObjectURL(blob);

        const a: HTMLAnchorElement = document.createElement("a");
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
            const mm: Map<string,string[]> = mmap.current;
            const node_picked: number | null = selected_node.current;
            const m_pos: number[] | Float32Array = mouse_pos.current.slice();
            const l_clicked: boolean = left_click.current;
            const hover_node: number | null = select(m_pos as vec2, rg, 8.0);

            // UPDATES
            tracker.update_position([m_pos[0], m_pos[1]]);
            rg.set_uniform_indices(gl, hover_node !== null ? hover_node : -1, node_picked !== null ? node_picked : -1);

            if (l_clicked) {
                const lc_state: TClickEnum = get_lc_states({ node_picked, hover_node });

                switch (lc_state) {
                    case ClickEnum.LC_ADD_NODE:
                        rg.update((g: kGraph<DrawNode, string>): kGraph<DrawNode,string> => {
                            const m_new: DrawNode = drawnode_build(m_pos[0], m_pos[1]);
                            g.add_node(m_new);
                            return g;
                        });

                        mmap.current = append_to_all(mm);
                        selected_node.current = null;
                        break;

                    case ClickEnum.LC_ADD_EDGE:
                        if (!rg.expose_graph().has_outgoing_to(node_picked!, hover_node!)) {
                            rg.update((g: kGraph<DrawNode,string>): kGraph<DrawNode,string> => {
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
            <MetadataCard selected_node={selected_node.current} metadata_map={mmap.current}/>
            <div>
                <label>Export format: </label>
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)}>
                    <option value="graphml">GraphML</option>
                    <option value="gv">DOT</option>
                </select>
                <button onClick={handleExport}>Export Graph</button>
            </div>
        </div>
    );
}

// TODO:
// NEED... A CANVAS -> DONE
// NEED... TO BE ABLE TO PUT TEXTURES ON THE CANVAS -> DONE
// NEED... TO BE ABLE TO "DRAW" POINTS AND LINES ON THE CANVAS -> CONSTRUCT GRAPH -> DONE

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