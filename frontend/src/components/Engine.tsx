import React from "react";
import { GraphEngine } from "../libs/engine/GraphEngine";
import { accept_file } from "../utils/files/file_funcs";

type CanvasCallback = (cv: HTMLCanvasElement) => void;

/** Hook for initializing the canvas & all structures dependent on its existence */
function useCanvasInstantiator(callbacks?: CanvasCallback[] | undefined): CanvasCallback {
    const setRef = React.useCallback((node: HTMLCanvasElement | null) => {
        if (node) {
            callbacks?.forEach((cb) => cb(node));
        }
    }, [callbacks]);
    return setRef;
}

/** Hook for updating the background of our app */
function useUpdateBackground(app_ref: React.RefObject<GraphEngine | null>, image_elem: HTMLImageElement | undefined) {
    React.useEffect(() => {
        console.log("Image Elem updated");
        console.log("Image Elem state: " + image_elem);
        if (app_ref.current !== null) {
            app_ref.current.set_background_image(image_elem);
        }
    }, [image_elem]);
}

/** Type coupling together the canvas callback & a reference to the app data */
type AppInstance = {
    canvas_instantiator: CanvasCallback;
    app_ref: React.RefObject<GraphEngine | null>;
}

/** Hook for setting the canvas app */
function useGraphEngineApp(image_elem?: HTMLImageElement | undefined): AppInstance {
    const app_data = React.useRef<GraphEngine>(null);
    const canvas_init: CanvasCallback = useCanvasInstantiator([(cv) => { if (!app_data.current) { app_data.current = GraphEngine.build(cv, image_elem); }} ]);
    useUpdateBackground(app_data, image_elem);

    React.useEffect(() => {
        const app: GraphEngine = app_data.current!;
        console.log("Creating App instance...");
        if (app === null) {
            console.error("By some magical set of circumstances, `app_data.current` = `NULL`. I fucked up.");
            return;
        }

        let last_time: DOMHighResTimeStamp = 0;
        let active: boolean = true;
        const render_loop: FrameRequestCallback = (time: DOMHighResTimeStamp) => {
            if (!active) { return; }
            app.update(last_time, time);
            app.draw();
            requestAnimationFrame(render_loop);
        }
        requestAnimationFrame(render_loop);
        return () => { 
            console.log("Ending App Instance...");
            active = false; 
        };
    }, []);

    return { canvas_instantiator: canvas_init, app_ref: app_data };
}

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


type ListDisplayProps<T> = {
  item_iter: Iterable<T>;
  renderItem: (item: T, index: number) => React.ReactNode;
};

function ListDisplayComponent<T>({ item_iter, renderItem }: ListDisplayProps<T>) {
    const items = Array.from(item_iter);
    return <div>{items.map(renderItem)}</div>;
}

/** Component for displaying the Global & Individual Node attributes */
function AttributeCardComponent() {
    // const [_, num_attrs_update] = React.useState(current!.num_attributes());

    return (
        <div id="engine-attribute-card">
            <h3>Global Node Attributes</h3>
            <p>This is an Attribute Card</p>
            <p>Edit the attributes of a node here</p>
            {/* 
                <ListDisplayComponent
                    item_iter={current!.iter_attributes()}
                    renderItem={ (item: string, index: number) => <div key={index}>{item}</div>}
                />
                <form action={(f: FormData)=>add_attribute(f, current!, num_attrs_update)}>
                    <input type="text" maxLength={20} name="new-attr" className="new-attr-input" required></input>
                    <button type="submit">Add Attribute</button>
                </form> 
            */}
        </div>
    );
}

/** Represents the "body" of our GraphEngine app. Includes the canvas as well as the cards for viewing and editing nodes local
 * and global attributes. */
export function EngineBodyComponent(engine_in: {width: number, height: number, image_elem?: HTMLImageElement | undefined}): React.JSX.Element {
    const app_instance: AppInstance = useGraphEngineApp(engine_in.image_elem);
    return (
        <div id="engine-canvas-div" style={{height: engine_in.height.toString() + "px", width: engine_in.width / 0.6}}>
            <canvas id="engine-canvas" ref={app_instance.canvas_instantiator} width={engine_in.width} height={engine_in.height} tabIndex={1}></canvas>
            <AttributeCardComponent/>
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