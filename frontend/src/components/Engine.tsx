import React from "react";
import { CircleInstance } from "../libs/engine/gui/Circle";
import { init_shader_program } from "../utils/webgl/shader_funcs"
import { Coord2D } from "../libs/engine/GraphEngine";
import { ImplPositionable } from "../utils/types/Positionable";

/** In actuality this function will be located in the GraphEngine */
function get_hover_id(mouse_pos: Coord2D, positions: number[], radii: number[]): number | null {
    if (positions.length / 3 === 0 || radii.length === 0 || (positions.length / 3 !== radii.length)) { return null; }
    
    const other_coord: Coord2D = new Coord2D();
    let closest_id: number = -1;
    let closest_dist_sqd: number = Number.POSITIVE_INFINITY;

    for (let i = 0; i < radii.length; i++) {
        const pos_idx: number = i * 3;
        other_coord.set_xy(positions[pos_idx], positions[pos_idx + 1]);
        const cur_dist_sqd: number = ImplPositionable.distance_squared(mouse_pos, other_coord);
        const cur_radius = radii[i];

        if (cur_dist_sqd <= closest_dist_sqd && cur_dist_sqd < (cur_radius * cur_radius)) {
            closest_dist_sqd = cur_dist_sqd;
            closest_id = i;
        }
    }

    return closest_id;
}

/** Rendering many circles with our circle instance WITH instanced rendering */
function with_instance_scene(canvas: HTMLCanvasElement): void {
    const circle_shader_instanced_vs: string = `
        precision lowp float;
    
        attribute vec2 aVertexPosition;
        attribute vec3 aVertexOffset;
        attribute float aRadius;

        varying float vCircleID;
    
        void main() {
            const float width = 600.0;
            const float height = 400.0;

            vCircleID = aVertexOffset.z; // extract the circle ID
    
            float sX = aVertexPosition.x * aRadius + aVertexOffset.x;
            float sY = aVertexPosition.y * aRadius + aVertexOffset.y;

            float nx = sX / width * 2.0 - 1.0;
            float ny = (height - sY) / height * 2.0 - 1.0;
    
            gl_Position = vec4(nx, ny, 0.0, 1.0);
        }
    `;

     /** Fragment Shader */
    const circle_shader_instanced_fs: string = `
        precision lowp float;

        uniform int uHoverID;
        varying float vCircleID;

        void main() {
            vec4 color_out = vec4(0.0, 1.0, 0.0, 1.0);
            if (uHoverID == int(vCircleID)) {
                color_out = vec4(1.0, 0.0, 0.0, 1.0);
            }

            gl_FragColor = color_out;
        }
    `;

    const circle_inst: CircleInstance = new CircleInstance(9);
    const positions: number[] = [
        100.0, 200.0, 0.0, // index (0-1) = offset, // index (2) = instance index
        150.0, 50.0, 1.0,
        350.0, 100.0, 2.0
    ];

    const radii: number[] = [
        20.0,
        15.0,
        40.0
    ];

    const gl: WebGL2RenderingContext = canvas.getContext("webgl2")!;
    const num_instances: number = positions.length / 3;
    const program: WebGLProgram = init_shader_program(gl, circle_shader_instanced_vs, circle_shader_instanced_fs)!;
    const vbo: WebGLBuffer = gl.createBuffer();

    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, circle_inst.data(), gl.STATIC_DRAW);
    
    const aVPos = gl.getAttribLocation(program, "aVertexPosition"); 

    gl.vertexAttribPointer(
        aVPos,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(aVPos);

    const offset_buffer: WebGLBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, offset_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const aVOff = gl.getAttribLocation(program, "aVertexOffset");

    gl.vertexAttribPointer(
        aVOff,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.enableVertexAttribArray(aVOff);
    gl.vertexAttribDivisor(aVOff, 1);

    const radii_buffer: WebGLBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, radii_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(radii), gl.STATIC_DRAW);

    const aRad = gl.getAttribLocation(program, "aRadius");

    gl.vertexAttribPointer(
        aRad,
        1,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.enableVertexAttribArray(aRad);
    gl.vertexAttribDivisor(aRad, 1);

    let uHPos = gl.getUniformLocation(program, "uHoverID");
    if (uHPos === null) {
        console.log("Couldn't find the position of uniform `uHoverID`");
    }

    const mouse_pos: Coord2D = new Coord2D();
    (gl.canvas as HTMLCanvasElement).addEventListener("mousemove", (event: MouseEvent) => {
        const bb: DOMRect = (gl.canvas as HTMLCanvasElement).getBoundingClientRect();
        mouse_pos.set_xy(
            event.clientX - bb.left,
            event.clientY - bb.top
        );
    });

    // Radius update data
    const radii_initials: number[] = radii.slice();
    const MI: number = 10; // max growth we allow in circle size
    const dg: number = 0.2; // change in growth per frame

    let last_time: number = 0;

    const update = (time: number) => {
        const dt = (time - last_time) / 16.67;
        last_time = time;

        const mouse_pos_local: Coord2D = Coord2D.from_coord(mouse_pos);
        const id = ((id_in: number | null) => { return !(id_in === null || id_in === -1) ? id_in : -1 })(get_hover_id(mouse_pos_local, positions, radii));

        for (let i = 0; i < radii.length; i++) {
            radii[i] = (i === id) 
                ? Math.min(radii_initials[i] + MI, radii[i] + dg * dt)
                : Math.max(radii_initials[i], radii[i] - dg * dt);
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, radii_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(radii), gl.STATIC_DRAW); // send current circle radius data

        gl.uniform1i(uHPos, id); // send data on the current hovered circle
    }
    
    const render = (time: number) => {
        update(time);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1.0);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, circle_inst.num_points(), num_instances);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
}

function time_based_with_instance_scene() {
    const circle_shader_instanced_vs: string = `
        precision lowp float;
    
        attribute vec2 aVertexPosition;
        attribute vec3 aVertexOffset;
        attribute float aRadius;

        varying float vCircleID;
    
        void main() {
            const float width = 600.0;
            const float height = 400.0;

            vCircleID = aVertexOffset.z; // extract the circle ID
    
            float sX = aVertexPosition.x * aRadius + aVertexOffset.x;
            float sY = aVertexPosition.y * aRadius + aVertexOffset.y;

            float nx = sX / width * 2.0 - 1.0;
            float ny = (height - sY) / height * 2.0 - 1.0;
    
            gl_Position = vec4(nx, ny, 0.0, 1.0);
        }
    `;

     /** Fragment Shader */
    const circle_shader_instanced_fs: string = `
        precision lowp float;

        uniform int uHoverID;
        varying float vCircleID;

        void main() {
            vec4 color_out = vec4(0.0, 1.0, 0.0, 1.0);
            if (uHoverID == int(vCircleID)) {
                color_out = vec4(1.0, 0.0, 0.0, 1.0);
            }

            gl_FragColor = color_out;
        }
    `;

    const circle_inst: CircleInstance = new CircleInstance(9);
    const positions: number[] = [
        100.0, 200.0, 0.0, // index (0-1) = offset, // index (2) = instance index
        150.0, 50.0, 1.0,
        350.0, 100.0, 2.0
    ];

    const radii: number[] = [
        20.0,
        15.0,
        40.0
    ];

    const gl: WebGL2RenderingContext = canvas.getContext("webgl2")!;
    const num_instances: number = positions.length / 3;
    const program: WebGLProgram = init_shader_program(gl, circle_shader_instanced_vs, circle_shader_instanced_fs)!;
    const vbo: WebGLBuffer = gl.createBuffer();

    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, circle_inst.data(), gl.STATIC_DRAW);
    
    const aVPos = gl.getAttribLocation(program, "aVertexPosition"); 

    gl.vertexAttribPointer(
        aVPos,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(aVPos);

    const offset_buffer: WebGLBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, offset_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const aVOff = gl.getAttribLocation(program, "aVertexOffset");

    gl.vertexAttribPointer(
        aVOff,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.enableVertexAttribArray(aVOff);
    gl.vertexAttribDivisor(aVOff, 1);

    const radii_buffer: WebGLBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, radii_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(radii), gl.STATIC_DRAW);

    const aRad = gl.getAttribLocation(program, "aRadius");

    gl.vertexAttribPointer(
        aRad,
        1,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.enableVertexAttribArray(aRad);
    gl.vertexAttribDivisor(aRad, 1);

    let uHPos = gl.getUniformLocation(program, "uHoverID");
    if (uHPos === null) {
        console.log("Couldn't find the position of uniform `uHoverID`");
    }

    const mouse_pos: Coord2D = new Coord2D();
    (gl.canvas as HTMLCanvasElement).addEventListener("mousemove", (event: MouseEvent) => {
        const bb: DOMRect = (gl.canvas as HTMLCanvasElement).getBoundingClientRect();
        mouse_pos.set_xy(
            event.clientX - bb.left,
            event.clientY - bb.top
        );
    });

    // Radius update data
    const radii_initials: number[] = radii.slice();
    const MI: number = 10; // max growth we allow in circle size
    const dg: number = 0.2; // change in growth per frame

    let last_time: number = 0;

    const update = (time: number) => {
        const dt = (time - last_time) / 16.67;
        last_time = time;

        const mouse_pos_local: Coord2D = Coord2D.from_coord(mouse_pos);
        const id = ((id_in: number | null) => { return !(id_in === null || id_in === -1) ? id_in : -1 })(get_hover_id(mouse_pos_local, positions, radii));

        for (let i = 0; i < radii.length; i++) {
            radii[i] = (i === id) 
                ? Math.min(radii_initials[i] + MI, radii[i] + dg * dt)
                : Math.max(radii_initials[i], radii[i] - dg * dt);
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, radii_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(radii), gl.STATIC_DRAW); // send current circle radius data

        gl.uniform1i(uHPos, id); // send data on the current hovered circle
    }
    
    const render = (time: number) => {
        update(time);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1.0);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, circle_inst.num_points(), num_instances);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
}


export function EnginePage(): React.JSX.Element {
    let ref = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        with_instance_scene(ref.current!);
    }, []);

    return (
        <div>
            <p>Hello world</p>
            <canvas ref={ref} width="600" height="400"></canvas>
        </div>
    );
}