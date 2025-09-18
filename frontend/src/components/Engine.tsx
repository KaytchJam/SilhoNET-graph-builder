import React from "react";
import { GraphEngine } from "../libs/engine/GraphEngine";
import { accept_file } from "../utils/files/file_funcs";

type CanvasCallback = (cv: HTMLCanvasElement) => void;

/** Hook for initializing the canvas & all structures dependent on its existence */
function useCanvasInstantiator(callbacks?: CanvasCallback[] | undefined): CanvasCallback {
    const setRef = React.useCallback((node: HTMLCanvasElement | null) => {
        // console.log("Canvas has been instantiated, this is the callback.");
        // console.log("The state of our canvas is: " + (node !== null ? "nodeValue" : "null"));
        if (node) {
            callbacks?.forEach((cb) => cb(node));
        }
    }, [callbacks]);
    return setRef;
}

/** Hook for setting the canvas app */
function useGraphEngineApp(image_elem?: HTMLImageElement | undefined): CanvasCallback {
    const app_data = React.useRef<GraphEngine>(null);
    const canvas_init: CanvasCallback = useCanvasInstantiator([(cv) => app_data.current = GraphEngine.build(cv, image_elem)]);

    React.useEffect(() => {
        const app: GraphEngine = app_data.current!;
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

    return canvas_init;
}

/** Represents the "body" of our GraphEngine app. Includes the canvas as well as the cards for viewing and editing nodes local
 * and global attributes. */
export function EngineBodyComponent(engine_in: {width: number, height: number, image_elem?: HTMLImageElement | undefined}): React.JSX.Element {
    const canvas_app_init: CanvasCallback = useGraphEngineApp(engine_in.image_elem);
    // console.log("mounting engineBodyComponent");
    return (
        <div>
            <canvas ref={canvas_app_init} width={engine_in.width} height={engine_in.height}></canvas>
        </div>
    );
}

/** Engine page component */
export function EnginePage(cv_shape: {width: number, height: number }): React.JSX.Element {
    const [image_in, set_image_in] = React.useState<HTMLImageElement | undefined>(undefined);
    // console.log(`image_in is ${(image_in === undefined) ? "undefined" : "defined"}`);

    return (
        <div>
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