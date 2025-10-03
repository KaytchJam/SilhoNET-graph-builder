import React from "react";
import { GraphEngine } from "../libs/engine/GraphEngine";
import { accept_file } from "../utils/files/file_funcs";
import { ListDisplayComponent } from "./utils/ListDisplayComponent";
import { useGraphEngineApp } from "../hooks/useGraphEngineApp";
import { type MetaGraphExporter, GraphMLExporter, DOTExporter, EdgeListExporter } from "../libs/engine/GraphExporter";

function add_attribute(form_data: FormData, g: GraphEngine, state_setter: React.Dispatch<React.SetStateAction<number>>): void {
    const item_text: string | undefined = form_data.get("new-attr")?.toString();
    if (item_text !== undefined) {
        const item_text_trimmed: string = item_text.trim();
        console.log(`Inserting New Attribute: ${item_text_trimmed}`);

        if (item_text_trimmed.length > 0 && !g.contains(item_text_trimmed)) {
            g.add_attribute(item_text_trimmed, true);
            state_setter(g.num_attributes()); // stage a re-render
        }
    }
}

function remove_attribute(g: GraphEngine, attr_name: string, state_setter: React.Dispatch<React.SetStateAction<number>>): void {
    g.remove_attribute(attr_name);
    state_setter(g.num_attributes());
}

type Ref<T> = {
    current: T;
}

function useIsGraphEngineUp(engine_ref: Ref<React.RefObject<GraphEngine | null>>, setter: React.Dispatch<React.SetStateAction<boolean>>): void {
    React.useEffect(() => {
        setter(engine_ref.current.current != undefined && engine_ref.current.current != null)
    }, [engine_ref.current.current]);
}

function GlobalAttributeComponent(args: { g: GraphEngine, attr_name: string, setter: React.Dispatch<React.SetStateAction<number>> }): React.JSX.Element {
    return (
        <div className="global-attr-div">
            <p className="global-attr-p"><b>{args.attr_name}</b></p>
            { args.g.is_removeable(args.attr_name) && <button className="global-attr-b" onClick={()=> remove_attribute(args.g, args.attr_name, args.setter)}>X</button>}
        </div>
    )
}

/** Component for displaying the Global & Individual Node attributes */
function AttributeCardComponent(engine_ref: Ref<React.RefObject<GraphEngine | null>>): React.JSX.Element {
    const [engine_up, set_engine_up] = React.useState(false);
    const [num_attrs, num_attrs_update] = React.useState(0);
    useIsGraphEngineUp(engine_ref, set_engine_up);
    
    const engine: GraphEngine | null = engine_ref.current.current;
    return (
        <div id="engine-attribute-card">
            <h3>Global Node Attributes</h3>
            <p>This is the Global Attribute Card</p>
            <p>Add or remove global node attributes here.</p>
            { engine_up && 
                <div id="global-attrs-div">
                    <ListDisplayComponent
                        item_list={Array.from(engine!.iter_attributes())}
                        renderFunc={ (item: string) => <GlobalAttributeComponent key={item} g={engine!} attr_name={item} setter={num_attrs_update}/>}
                    />
                </div>
            }
            { engine_up && num_attrs < 10 && 
                <form action={(f: FormData)=>add_attribute(f, engine!, num_attrs_update)}>
                    <input type="text" maxLength={20} name="new-attr" className="new-attr-input" required></input>
                    <button type="submit">Add Attribute</button>
                </form>
            }  
        </div>
    );
}

function GraphSerializerComponent(engine_ref: Ref<React.RefObject<GraphEngine | null>>) {
    const [engine_up, set_engine_up] = React.useState(false);
    useIsGraphEngineUp(engine_ref, set_engine_up);
    const [exportFormat, setExportFormat] = React.useState<"graphml" | "gv" | "edgelist">("graphml");
    const [graphString, setGraphString] = React.useState("");

    const handleExport = () => {
            const engine = engine_ref.current.current!;
            const mg = engine.expose_graph().expose_graph();
    
            let exporter: MetaGraphExporter;
            switch (exportFormat) {
                case "graphml":
                    exporter = new GraphMLExporter();
                    break;
                case "gv":
                    exporter = new DOTExporter();
                    break;
                case "edgelist":
                    exporter = new EdgeListExporter();
                    break;
                default:
                    console.error("Unsupported format");
                    return;
            }
    
            const output: string = exporter.serialize(mg); // assumes this returns a string
            setGraphString(output);
        };

    return (
        <div>
            { engine_up && 
                <div>
                    <label>Export format: </label>
                    <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)}>
                        <option value="graphml">GraphML</option>
                        <option value="gv">DOT</option>
                        <option value="edgelist">EdgeList</option>
                    </select>
                    <button onClick={handleExport}>Export Graph</button>
                    <div id="engine-export-string"><p>{graphString}</p></div>
                </div>
            }
        </div>
    );
}

/** Represents the "body" of our GraphEngine app. Includes the canvas as well as the cards for viewing and editing nodes local
 * and global attributes. */
export function EngineBodyComponent(engine_in: {width: number, height: number, image_elem?: HTMLImageElement | undefined}): React.JSX.Element {
    const app_instance = useGraphEngineApp(engine_in.image_elem);
    return (
        <div>
            <div id="engine-canvas-div" style={{height: engine_in.height.toString() + "px", width: engine_in.width / 0.6}}>
                <canvas id="engine-canvas" ref={app_instance.canvas_instantiator} width={engine_in.width} height={engine_in.height} tabIndex={1}></canvas>
                <AttributeCardComponent current={app_instance.app_ref}/>
            </div>
            <GraphSerializerComponent current={app_instance.app_ref}/>
        </div>
    );
}

/** Engine page component */
export function EnginePage(cv_shape: {width: number, height: number }): React.JSX.Element {
    const [image_in, set_image_in] = React.useState<HTMLImageElement | undefined>(undefined);

    return (
        <div id="engine-page-div" style={{width: cv_shape.width / 0.6}}>
            <h4>Welcome to the Engine Page. You can either draw your graph over:</h4>
            <ol type="a">
                <li>A blank canvas</li>
                <li>A user-inputted image</li>
            </ol>
            <form action={(f: FormData) => accept_file(f, "image-input", set_image_in)}>
                <input type="file" accept="image/jpeg" name="image-input"/>
                <button type="submit" name="image-submit">Create Canvas</button>
            </form>
            <EngineBodyComponent width={cv_shape.width} height={cv_shape.height} image_elem={image_in}/>
        </div>
    );
}