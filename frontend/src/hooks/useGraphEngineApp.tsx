import React from "react";
import { GraphEngine } from "../libs/engine/GraphEngine";

type CanvasCallback = (cv: HTMLCanvasElement) => void;

/** Type coupling together the canvas callback & a reference to the app data */
export type AppInstance = {
    canvas_instantiator: CanvasCallback;
    app_ref: React.RefObject<GraphEngine | null>;
}

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

/** Hook for setting the canvas app */
export function useGraphEngineApp(image_elem?: HTMLImageElement | undefined): AppInstance {
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
            app_data.current = null;
            active = false; 
        };
    }, []);

    return { canvas_instantiator: canvas_init, app_ref: app_data };
}



