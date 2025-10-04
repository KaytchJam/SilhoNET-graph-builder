import React from "react";
import { GraphEngine } from "../libs/engine/GraphEngine";
import { accept_file } from "../utils/files/file_funcs";
import { ListDisplayComponent } from "./utils/ListDisplayComponent";
import { useGraphEngineApp } from "../hooks/useGraphEngineApp";
import { type MetaGraphExporter, GraphMLExporter, DOTExporter, EdgeListExporter } from "../libs/engine/GraphExporter";

type ReactSetter<T> = React.Dispatch<React.SetStateAction<T>>;

function add_attribute(form_data: FormData, g: GraphEngine, state_setter: ReactSetter<number>): void {
    const item_text: string | undefined = form_data.get("new-attr")?.toString();
    if (item_text !== undefined) {
        const item_text_trimmed: string = item_text.trim();
        // console.log(`Inserting New Attribute: ${item_text_trimmed}`);

        if (item_text_trimmed.length > 0 && !g.contains(item_text_trimmed)) {
            g.add_attribute(item_text_trimmed, true);
            state_setter(g.num_attributes()); // stage a re-render
        }
    }
}

function remove_attribute(g: GraphEngine, attr_name: string, state_setter: ReactSetter<number>): void {
    g.remove_attribute(attr_name);
    state_setter(g.num_attributes());
}

type Ref<T> = {
    current: T;
}

function useEngineNonNullWatcher(engine_ref: Ref<React.RefObject<GraphEngine | null>>, setter: ReactSetter<boolean>): void {
    React.useEffect(() => {
        setter(engine_ref.current.current != undefined && engine_ref.current.current != null)
    }, [engine_ref.current.current]);
}

function useAttributeCardSetup(
    engine_ref: Ref<React.RefObject<GraphEngine | null>>, 
    bool_setter: React.Dispatch<React.SetStateAction<boolean>>,
    num_setter: React.Dispatch<React.SetStateAction<number>>
): void {
    React.useEffect(() => {
        const is_nonnull = engine_ref.current.current != undefined && engine_ref.current.current != null;
        bool_setter(is_nonnull);
        if (is_nonnull) {
            const engine: GraphEngine = engine_ref.current.current!;
            engine.add_update_callback((selected_node: number | null) => {
                num_setter(selected_node != null ? selected_node : -1 );
            });
        }
    }, [engine_ref]);
}

function GlobalAttributeComponent(args: { g: GraphEngine, attr_name: string, setter: ReactSetter<number> }): React.JSX.Element {
    return (
        <div className="global-attr-div">
            <p className="global-attr-p"><b>{args.attr_name}</b></p>
            { args.g.is_removeable(args.attr_name) && <button className="global-attr-b" onClick={()=> remove_attribute(args.g, args.attr_name, args.setter)}>X</button>}
        </div>
    )
}

function GlobalAttributeCardComponent(engine_ref: Ref<React.RefObject<GraphEngine | null>>) {
    const [_, num_attrs_update] = React.useState(0);
    const engine = engine_ref.current.current!;
    const attr_list = Array.from(engine.iter_attributes());
    const attr2node = (item: string) => <GlobalAttributeComponent key={item} g={engine} attr_name={item} setter={num_attrs_update}/>;

    return (
        <>
            <h3>Global Node Attributes</h3>
            <p>Add or remove global node attributes here.</p>
            <div id="global-attrs-div">
                <ListDisplayComponent item_list={attr_list} renderFunc={attr2node} />
            </div>
            <form action={(f: FormData)=>add_attribute(f, engine!, num_attrs_update)}>
                <input type="text" maxLength={20} name="new-attr" className="new-attr-input" required></input>
                <button type="submit">Add Attribute</button>
            </form>
        </>
    )
}

function NodeAttributeComponent(args: { 
    engine_ref: React.RefObject<GraphEngine | null>, 
    attr_name: string, 
    selected_node: number,
    update_func: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
    return (
        <label key={args.attr_name} className="node-attr-label"> <b>{args.attr_name}:</b>
            <input type="text" value={args.engine_ref.current!.get_node_attr_value(args.attr_name, args.selected_node)!}
                className="node-attr-input" maxLength={20} onChange={args.update_func}/>
        </label>
    )
}

function update_node_attribute_value(
    event: React.ChangeEvent<HTMLInputElement>, 
    engine: GraphEngine, 
    attr_name: string,
    selected_node: number, 
    prev_setter_val: number,
    setter: ReactSetter<number>
) {
    const val: string = event.target.value;
    engine.update_node_attr_value(attr_name, selected_node, val);
    setter((prev_setter_val + 1) % 5);
}

function NodeAttributeCardComponent(args: {current: React.RefObject<GraphEngine | null>, selected_node: number}) {
    const [toggle, update_toggle] = React.useState(0);
    const attr_list = Array.from(args.current.current!.iter_attributes());
    const attr2node = (item: string) => <NodeAttributeComponent engine_ref={args.current} attr_name={item} selected_node={args.selected_node} update_func={(event) => {update_node_attribute_value(event, args.current.current!, item, args.selected_node, toggle, update_toggle)}} />

    return (
        <>
            <h3>Local Node Attributes</h3>
            <p>Node {args.selected_node} Data</p>
            <p>A node has been selected. Feast your eyes upon its card. And update it so your heart's content! [Groan] </p>
            <div id="node-attrs-div">
                <ListDisplayComponent item_list={attr_list} renderFunc={attr2node}/>
            </div>
        </>
    );
}

/** Component for displaying the Global & Individual Node attributes */
function AttributeCardComponent(engine_ref: Ref<React.RefObject<GraphEngine | null>>): React.JSX.Element {
    const [engine_up, set_engine_up] = React.useState(false);
    const [selected_node, set_node_selected] = React.useState(-1);
    useAttributeCardSetup(engine_ref, set_engine_up, set_node_selected);
    
    const card_out = selected_node != -1 
        ? <NodeAttributeCardComponent current={engine_ref.current} selected_node={selected_node}/>
        : <GlobalAttributeCardComponent current={engine_ref.current}/>;

    return (
        <div id="engine-attribute-card">
            { engine_up && card_out }
        </div>
    );
}

function GraphSerializerComponent(engine_ref: Ref<React.RefObject<GraphEngine | null>>) {
    const [engine_up, set_engine_up] = React.useState(false);
    useEngineNonNullWatcher(engine_ref, set_engine_up);
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
        <>
            { engine_up && 
                <>
                    <label>Export format: </label>
                    <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)}>
                        <option value="graphml">GraphML</option>
                        <option value="gv">DOT</option>
                        <option value="edgelist">EdgeList</option>
                    </select>
                    <button onClick={handleExport}>Export Graph</button>
                    <div id="engine-export-string"><p>{graphString}</p></div>
                </>
            }
        </>
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