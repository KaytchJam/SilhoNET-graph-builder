import React from "react";
import { CircleInstance } from "../libs/engine/gui/Circle";
import { init_shader_program } from "../utils/webgl/shader_funcs"
import { Coord2D } from "../libs/engine/GraphEngine";
import { ImplPositionable } from "../utils/types/Positionable";
import { LineInstance } from "../libs/engine/gui/Line";
import { vec3, mat3 } from "gl-matrix"

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

function get_line_hover_id(mouse_pos: Coord2D, line_positions: number[], edges: number[], thickness: number): number | null {
    const MOUSE_VEC: vec3 = new Float32Array([...mouse_pos.get_xy(),1.0]);
    const Z: vec3 = new Float32Array([0.0, 0.0, -1.0]);

    let dir: vec3 = new Float32Array(3);
    let normal: vec3 = new Float32Array(3);
    let transform: mat3 = new Float32Array(9);
    let mouse_local: vec3 = new Float32Array(3);

    // console.log("mouse coods: ", [...MOUSE_VEC]);
    // console.log("positions: ", line_positions);

    for (let i = 0; i < edges.length; i += 2) {
        const start_pos_idx: number = edges[i] * 2;
        const end_pos_idx: number = edges[i+1] * 2;

        dir[0] = line_positions[end_pos_idx] - line_positions[start_pos_idx];
        dir[1] = line_positions[end_pos_idx + 1] - line_positions[start_pos_idx + 1];
        dir[2] = 0.0;

        // console.log("dir (pre-normalization): ", dir);
        
        const length: number = vec3.length(dir);
        dir = vec3.normalize(dir, dir);
        normal = vec3.cross(normal, dir, Z);
        
        // console.log("dir (post-normalization): ", dir);
        // console.log("normal: ", normal);

        transform[0] = dir[0];
        transform[1] = dir[1];
        transform[2] = 0.0;

        transform[3] = normal[0];
        transform[4] = normal[1];
        transform[5] = 0.0;

        transform[6] = line_positions[start_pos_idx];
        transform[7] = line_positions[start_pos_idx + 1];
        transform[8] = 1.0;

        // console.log("transform: ", transform);

        transform = mat3.invert(transform, transform);
        mouse_local = vec3.transformMat3(mouse_local, MOUSE_VEC, transform);

        // console.log(`mouse local (edge ${i / 2}) = (${mouse_local[0]},${mouse_local[1]},${mouse_local[2]}`);

        if ((0.0 <= mouse_local[0] && mouse_local[0] <= length) && (-thickness <= mouse_local[1] && mouse_local[1] <= thickness)) {
            return i / 2;
        }
    }

    return null;
}

/** Bounds a number `value` between thresholds `lower` and `upper` */
function clamp(lower: number, value: number, upper: number) {
    return Math.min(upper, Math.max(lower, value));
}

type Interval = {
    low: number,
    high: number
};

/** Randomly constructs Coord2D coordinates within the area covered by `x_range` and `y_range` */
function random_coords(n: number, x_range: Interval, y_range: Interval): Coord2D[] {
    let coords: Coord2D[] = new Array(n);
    for (let i = 0; i < n; i++) {
        coords[i] = Coord2D.from([
            Math.random() * (x_range.high - x_range.low) + x_range.low,
            Math.random() * (y_range.high - y_range.low) + y_range.low
        ]);
    }
    return coords;
}

// type Colors = {
//     r: number,
//     g: number,
//     b: number
// }

// function random_colors(n: number): number[] {
//     const colors = new Array(n);
//     for (let i = 0; i < n; i++) {

//     }

//     return colors;
// }


/** Holds the state for our App --- very messy lol */
type AppData = {
    context: WebGL2RenderingContext,
    
    circle_vao: WebGLVertexArrayObject;
    num_circles: number
    circle_instance: CircleInstance
    positions: number[],
    radii: number[],
    hover_progress: Float32Array,
    uHPos: WebGLUniformLocation | null,
    hov_buffer: WebGLBuffer,
    program: WebGLProgram | null
    
    line_vao: WebGLVertexArrayObject,
    num_lines: number,
    line_instance: LineInstance,
    line_positions: number[],
    line_edges: number[],
    line_program: WebGLProgram | null,
    line_hover_progress: Float32Array,
    line_hov_buffer: WebGLBuffer,
    uLPos: WebGLUniformLocation | null,
    
    mouse_pos: Coord2D,
}

/** Initializer for `AppData` */
function init_app(
    cv: HTMLCanvasElement, data: React.RefObject<AppData | null>, num_circles: number, num_lines: number,
    radius_over_width_ratios: Interval = { low: 0.025, high: 0.166}
): void {
    const context: WebGL2RenderingContext | null = cv.getContext("webgl2");
    if (context === null) {
        console.error("Was unable to get context 'webgl2' from the HTMLCanvasElement");
        return;
    }
    
    const radius_low: number = cv.width * radius_over_width_ratios.low;
    const radius_high: number = cv.width * radius_over_width_ratios.high;
    const radius_range_size: number = radius_high - radius_low;
    
    data.current = { 
        context: context,
        
        // CIRCLE RENDERING (COULD HONESTLY BREAK THESE DOWN INTO TWO SEPERATE CLASSES NGL)
        circle_vao: 0,
        num_circles: num_circles,
        circle_instance: new CircleInstance(81),
        positions: random_coords(num_circles, {low: radius_high, high: cv.width - radius_high},{low: radius_high, high: cv.height - radius_high}).map((c, idx) => [...c.get_xy(), idx]).flat(),
        radii: new Array(num_circles).fill(0).map(_ => Math.random() * radius_range_size + radius_low),
        hover_progress: (new Float32Array(num_circles)).fill(0),
        hov_buffer: 0,
        uHPos: null,
        program: null,
        
        // LINE RENDERING
        line_vao: 0,
        num_lines: num_lines,
        line_program: null,
        line_positions: random_coords(num_lines * 2, {low: 20, high: cv.width - 20}, {low: 20, high: cv.height - 20}).map((c) => c.get_xy()).flat(),
        line_edges: [0, 1, 2, 3], //random_coords(num_lines, {low: 0, high: num_lines}, {low: 0, high: num_lines}).map((c) => c.get_xy()).flat().map((v) => Math.floor(v)),
        line_instance: new LineInstance(),
        line_hover_progress: (new Float32Array(2)).fill(0),
        line_hov_buffer: 0,
        uLPos: null,

        // MOUSE COORDS
        mouse_pos: new Coord2D(0,0)
    };

    const mouse_callback = (event: MouseEvent) => {
        const bb: DOMRect = cv.getBoundingClientRect();
        data.current!.mouse_pos.set_xy(
            event.clientX - bb.left,
            event.clientY - bb.top
        );
    }
    
    cv.addEventListener("mousemove", mouse_callback);
}

const glsl = (x: any) => x;

/** Vertex Shader */ 
const c_shader_instanced_vs: string = glsl`
precision lowp float;

    attribute vec2 aVertexPosition;
    attribute vec3 aVertexOffset;
    attribute float aRadius;
    attribute float aHoverProgress;
    
    uniform lowp int uHoverID;

    varying float vCircleID;
    varying float vHoverProgress;
    
    // linear interpolation
    float lerp(float a, float b, float t) {
        return (1.0 - t) * a + t * b;
    }

    float smooth_lerp(float a, float b, float t) {
        float t3 = t * t * t;
        t = 3.0 * t3 - 2.0 * t3;
        return lerp(a, b, t);
    }
    
    void main() {
        const float width = 600.0;
        const float height = 400.0;

        vCircleID = aVertexOffset.z; // extract the circle ID
        vHoverProgress = aHoverProgress;
        
        // we want the hover element to appear "on top"
        float cur_hovered = float(uHoverID == int(vCircleID)) * -1.0;
        
        float radius = smooth_lerp(aRadius, aRadius + 5.0, aHoverProgress);
        float sX = aVertexPosition.x * radius + aVertexOffset.x;
        float sY = aVertexPosition.y * radius + aVertexOffset.y;
        
        float nx = sX / width * 2.0 - 1.0;
        float ny = (height - sY) / height * 2.0 - 1.0;
        
        gl_Position = vec4(nx, ny, cur_hovered, 1.0);
    }
`;

/** Fragment Shader */
const c_shader_instanced_fs: string = glsl`
    precision lowp float;
    
    uniform lowp int uHoverID;
    
    varying float vCircleID;
    varying float vHoverProgress;
    
    vec3 lerp(vec3 a, vec3 b, float t) {
        return (1.0 - t) * a + t * b;
    }
    
    vec3 smooth_lerp(vec3 a, vec3 b, float t) {
        float t3 = t * t * t;
        t = 3.0 * t3 - 2.0 * t3;
        return lerp(a, b, t);
    }
    
    void main() {
        vec4 color_out = vec4(0.0, 1.0, 0.0, 1.0);
        if (uHoverID == int(vCircleID)) {
            vec3 target = vec3(1.0, 0.0, 0.0);
            // color_out = vec4(smooth_lerp(color_out.xyz, target, vHoverProgress), 1.0);
            color_out = vec4(target, 1.0);
        }

        gl_FragColor = color_out;
    }
`;

const l_shader_instanced_vs = glsl`
    precision lowp float;

    attribute vec3 aVertexPosition;
    attribute vec4 aEdgeOffsets;
    attribute float aHoverProgress;
    attribute float aLineID;

    uniform lowp int uHoverID;

    varying float vLineID;

    /** For normal calculation */
    vec3 Z = vec3(0.0, 0.0, -1.0);
    float thickness = 5.0;
    
    /** Calculate the normal of our line's direction  */
    vec2 calculate_normal(vec2 dir) {
        return cross(vec3(dir,0.0), Z).xy;
    }

    float lerpf(float a, float b, float t) {
        return (1.0 - t) * a + t * b;
    }
    
    float smooth_lerpf(float a, float b, float t) {
        float t3 = t * t * t;
        t = 3.0 * t3 - 2.0 * t3;
        return lerpf(a, b, t);
    }

    void main() {
        const float width = 600.0;
        const float height = 400.0;

        vLineID = aLineID;
        
        int index = int(aVertexPosition.z);
        vec2 from = aEdgeOffsets.xy;
        vec2 to = aEdgeOffsets.zw;

        vec2 direction = normalize(to - from);
        vec2 normal = calculate_normal(direction);

        // EVEN INDICES -> BOTTOM SIDE OF THE LINE
        if (index == 0 || index == 2) {
            normal = -1.0 * normal;
        }
        
        // (INDEX < 2) -> "FROM" POINT
        vec2 offset = from;
        if (index >= 2) {
            offset = to;
        }

        float thickness_out = smooth_lerpf(thickness, thickness + 5.0, aHoverProgress);

        gl_Position = vec4(offset + thickness_out * normal, 0.0, 1.0);
        gl_Position.x = gl_Position.x / width * 2.0 - 1.0;
        gl_Position.y = (height - gl_Position.y) / height * 2.0 - 1.0;
    }
`;
    
const l_shader_instanced_fs = glsl`
    precision lowp float;

    uniform lowp int uHoverID;

    varying float vLineID;

    void main() {
        vec3 color = vec3(1.0, 1.0, 1.0);
        if (uHoverID == int(vLineID)) {
            color = vec3(0.0, 5.0, 1.0);
        }

        gl_FragColor = vec4(color, 1.0);
    }
`;
    
    /** creates a buffer, fills it with `data` and returns said buffer's id */
    function buffer_init<Buffer extends ArrayBufferView<ArrayBufferLike>>(context: WebGL2RenderingContext, target: GLenum, data: Buffer, usage: GLenum) {
    const buffer = context.createBuffer();
    context.bindBuffer(target, buffer);
    context.bufferData(target, data, usage);
    return buffer;
}

/** initializes multiples buffers (with the same target & usage parameters) and returns all their ids */
function buffer_init_multiple<Buffer extends ArrayBufferView<ArrayBufferLike>>(context: WebGL2RenderingContext, target: GLenum, usage: GLenum, dataset: Buffer[]): WebGLBuffer[] {
    const buffer_ids: WebGLBuffer[] = new Array(dataset.length);
    for (let i = 0; i < dataset.length; i++) {
        buffer_ids[i] = buffer_init(
            context, 
            target,
            dataset[i], 
            usage
        );
    }
    return buffer_ids;
}

type AttribData = {
    attrib_name: string,
    buffer_id: WebGLBuffer
    attrib_loc?: GLint | undefined,
};

/** Sets the vertexAttribPointer given a shader program, and an AttribData field `attrib`.
 * If `attrib`'s field `attrib.attrib_loc` is **undefined** then the function performs a lookup via
 * `getAttribLocation()` for the attribute location using `attrib.attrib_name`. If it is defined
 * then this lookup is not performed. Finally, it enables the vertexAttribArray at 
 * `attrib.attrib_location`. Note that the bound buffer is set to `attrib.buffer_id` by this
 * function as well.  */
function set_attrib_data(context: WebGL2RenderingContext, program: WebGLProgram, attrib: AttribData,
    size: GLint, type: GLenum, normalized: GLboolean = false, stride: GLsizei = 0, offset: GLintptr = 0
): AttribData {
    context.useProgram(program);
    if (attrib.attrib_loc === undefined) {
        attrib.attrib_loc = context.getAttribLocation(program, attrib.attrib_name);
    }

    context.bindBuffer(context.ARRAY_BUFFER, attrib.buffer_id);
    context.vertexAttribPointer(attrib.attrib_loc, size, type, normalized, stride, offset);
    context.enableVertexAttribArray(attrib.attrib_loc);

    return attrib;
}

/** The same as `set_attrib_data()` except it also sets `vertexAttribDivisor` with the `divisor` argument. */
function set_attrib_data_instanced(context: WebGL2RenderingContext, program: WebGLProgram, attrib: AttribData,
    size: GLint, type: GLenum, normalized: GLboolean = false, stride: GLsizei = 0, offset: GLintptr = 0, divisor: GLuint = 1
): AttribData {
    context.useProgram(program);
    if (attrib.attrib_loc === undefined) {
        attrib.attrib_loc = context.getAttribLocation(program, attrib.attrib_name);
    }
    
    context.bindBuffer(context.ARRAY_BUFFER, attrib.buffer_id);
    context.vertexAttribPointer(attrib.attrib_loc, size, type, normalized, stride, offset);
    context.enableVertexAttribArray(attrib.attrib_loc);
    context.vertexAttribDivisor(attrib.attrib_loc, divisor);
    
    return attrib;
}

/** Update function */
function app_update(app: AppData, prev_time: DOMHighResTimeStamp, time: DOMHighResTimeStamp): DOMHighResTimeStamp {
    const gl = app.context;
    const dt = (time - prev_time) / 16.67;
    
    // find the circle that we are hovering over (if any)
    const mouse_pos_local: Coord2D = Coord2D.from_coord(app.mouse_pos);
    const id = ((id_in: number | null) => { return !(id_in === null || id_in === -1) ? id_in : -1 })(get_hover_id(mouse_pos_local, app.positions, app.radii));
    
    // if we're hovering over a circle, increase its "hover time"
    for (let i = 0; i < app.num_circles; i++) {
        app.hover_progress[i] = clamp(0.0, (i == id) ? app.hover_progress[i] + dt : app.hover_progress[i] - dt, 1.0);
    }

    const line_id: number | null = get_line_hover_id(mouse_pos_local, app.line_positions, app.line_edges, 5);
    for (let i = 0; i < app.line_edges.length / 2; i++) {
        app.line_hover_progress[i] = clamp(0.0, (line_id !== null && i == line_id) ? app.line_hover_progress[i] + dt : app.line_hover_progress[i] - dt, 1.0);
    }

    gl.bindVertexArray(app.circle_vao);
    gl.useProgram(app.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, app.hov_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, app.hover_progress, gl.STATIC_DRAW); // send current circle hover progress data
    gl.uniform1i(app.uHPos, id); // send data on the current hovered circle

    gl.bindVertexArray(app.line_vao);
    gl.useProgram(app.line_program);
    gl.bindBuffer(gl.ARRAY_BUFFER, app.line_hov_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, app.line_hover_progress, gl.STATIC_DRAW);
    gl.uniform1i(app.uLPos, line_id !== null ? line_id : -1);

    return time;
}

/** Draw function */
function app_draw(app: AppData): void {
    const gl = app.context;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clearDepth(1.0);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // circle rendering
    gl.bindVertexArray(app.circle_vao);
    gl.useProgram(app.program);
    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, app.circle_instance.num_points(), app.num_circles);

    // line rendering
    gl.bindVertexArray(app.line_vao);
    gl.useProgram(app.line_program);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, app.line_instance.num_points(), app.num_lines);
}

function init_circle_vao_data(app: AppData): WebGLVertexArrayObject {
    const gl: WebGL2RenderingContext = app.context;
    const program: WebGLProgram = app.program!;

    const circle_vao: WebGLVertexArrayObject = gl.createVertexArray();
    gl.bindVertexArray(circle_vao);
    
    const [cg_buffer, off_buffer, rad_buffer, hov_buffer] = buffer_init_multiple(gl, gl.ARRAY_BUFFER, gl.STATIC_DRAW, [
            new Float32Array(app.circle_instance.data()),
            new Float32Array(app.positions),
            new Float32Array(app.radii),
            app.hover_progress
    ]);
    
    set_attrib_data(gl, program, {attrib_name: "aVertexPosition", buffer_id: cg_buffer}, 2, gl.FLOAT);
    set_attrib_data_instanced(gl, program, {attrib_name: "aVertexOffset", buffer_id: off_buffer}, 3, gl.FLOAT);
    set_attrib_data_instanced(gl, program, {attrib_name: "aRadius", buffer_id: rad_buffer}, 1, gl.FLOAT);

    app.hov_buffer = set_attrib_data_instanced(gl, program, {attrib_name: "aHoverProgress", buffer_id: hov_buffer}, 1, gl.FLOAT).buffer_id;
    app.uHPos = gl.getUniformLocation(program, "uHoverID");

    if (app.uHPos === null) {
        console.error("Unable to find location of uniform `uHoverID`...");
        return 0;
    }
    
    return circle_vao;
}

function init_line_vao_data(app: AppData): WebGLVertexArrayObject {
    const gl: WebGL2RenderingContext = app.context;
    const program: WebGLProgram = app.line_program!;
    
    const line_vao: WebGLVertexArrayObject = gl.createVertexArray();
    gl.bindVertexArray(line_vao);
    
    const edge_positions = new Array(app.num_lines * 4);
    for (let i = 0; i < app.num_lines; i++) {
        const true_idx: number = i * 4;
        const edge_idx: number = i * 2;
        const first_pos_idx: number = app.line_edges[edge_idx] * 2;
        const second_pos_idx: number = app.line_edges[edge_idx + 1] * 2;

        edge_positions[true_idx] = app.line_positions[first_pos_idx];
        edge_positions[true_idx + 1] = app.line_positions[first_pos_idx + 1];
        edge_positions[true_idx + 2] = app.line_positions[second_pos_idx];
        edge_positions[true_idx + 3] = app.line_positions[second_pos_idx + 1];
    }
    
    console.log("edges: ", app.line_edges);
    
    const li_buffer = buffer_init(gl, gl.ARRAY_BUFFER, app.line_instance.data(), gl.STATIC_DRAW);
    const edge_pos_buffer = buffer_init(gl, gl.ARRAY_BUFFER, new Float32Array(edge_positions), gl.STATIC_DRAW);
    const line_hov_buffer = buffer_init(gl, gl.ARRAY_BUFFER, app.line_hover_progress, gl.STATIC_DRAW);
    const line_id_buffer = buffer_init(gl, gl.ARRAY_BUFFER, new Float32Array(app.line_edges.length / 2).map((_,i) => i), gl.STATIC_DRAW);

    set_attrib_data(gl, program, {attrib_name: "aVertexPosition", buffer_id: li_buffer}, 3, gl.FLOAT);
    set_attrib_data_instanced(gl, program, {attrib_name: "aEdgeOffsets", buffer_id: edge_pos_buffer}, 4, gl.FLOAT);
    set_attrib_data_instanced(gl, program, {attrib_name: "aHoverProgress", buffer_id: line_hov_buffer}, 1, gl.FLOAT);
    set_attrib_data_instanced(gl, program, {attrib_name: "aLineID", buffer_id: line_id_buffer}, 1, gl.FLOAT);

    app.line_hov_buffer = line_hov_buffer;
    app.uLPos = gl.getUniformLocation(program, "uHoverID");

    if (app.uLPos === null) {
        console.error("Unabled to find location of uniform `uHoverID`...");
        return 0;
    }

    return line_vao;
}

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

/** Hook for setting the canvas app */
function useCircleApp(num_circles: number, num_lines: number): CanvasCallback {
    const app_data = React.useRef<AppData>(null);
    const canvas_init: CanvasCallback = useCanvasInstantiator([(cv) => init_app(cv, app_data, num_circles, num_lines)]);

    React.useEffect(() => {
        const app: AppData = app_data.current!;
        const gl: WebGL2RenderingContext = app.context;

        const program: WebGLProgram | null = init_shader_program(gl, c_shader_instanced_vs, c_shader_instanced_fs);
        if (program === null) {
            console.error("Error occurred during construction of the Circle WebGLProgram.");
            return;
        }

        app.program = program;
        app.circle_vao = init_circle_vao_data(app);
        if (app.circle_vao === 0) { 
            console.error("Error during circle VAO construction.");
            return;
        }

        const line_program: WebGLProgram | null = init_shader_program(gl, l_shader_instanced_vs, l_shader_instanced_fs);
        if (line_program === null) {
            console.error("Error occurred during construction of the Line WebGLProgram");
            return;
        }

        app.line_program = line_program;
        app.line_vao = init_line_vao_data(app);
        if (app.line_vao === 0) {
            console.error("Error during Line VAO construction");
            return;
        }

        let last_time: DOMHighResTimeStamp = 0;
        let active = true;
        const render_loop: FrameRequestCallback = (time: DOMHighResTimeStamp) => {
            if (!active) { return; }
            last_time = app_update(app, last_time, time);
            app_draw(app);
            requestAnimationFrame(render_loop);
        }
        requestAnimationFrame(render_loop);
        return () => { 
            active = false; 
            if (app.program) gl.deleteProgram(app.program);
            if (app.circle_vao) gl.deleteVertexArray(app.circle_vao);
            if (app.line_program) gl.deleteProgram(app.line_program);
            if (app.line_vao) gl.deleteVertexArray(app.line_vao);
        };
    }, []);

    return canvas_init;
}

/** Engine page component */
export function EnginePage(cv_shape: {width: number, height: number }): React.JSX.Element {
    const canvas_app_init: CanvasCallback = useCircleApp(3, 3);
    return (
        <div>
            <p>Hello world</p>
            <canvas ref={canvas_app_init} width={cv_shape.width} height={cv_shape.height}></canvas>
        </div>
    );
}