import React from 'react';
import "./WebGLComponent.css";
import { mat4 } from 'gl-matrix';

const glsl = (x: any) => x;

const vs_source = glsl`
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    varying lowp vec4 vColor;

    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
`;

const fs_source = glsl`
    varying lowp vec4 vColor;

    void main() {
        gl_FragColor = vColor;
    }
`;


type AttribLocations = {
    vertex_position: number,
    vertex_colors: number
};

type UniformLocations = {
    projection_matrix: WebGLUniformLocation | null,
    mvp_matrix: WebGLUniformLocation | null
};

type ProgramInfo = {
    program: WebGLProgram,
    attrib_locations: AttribLocations,
    uniform_locations: UniformLocations 
};

type Buffers = {
    position: WebGLBuffer,
    color: WebGLBuffer
}

function load_shader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader | null {
    const shader: WebGLShader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function init_shader_program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | null {
    const vertex_shader = load_shader(gl, gl.VERTEX_SHADER, vs);
    const frag_shader = load_shader(gl, gl.FRAGMENT_SHADER, fs);
    const shader_program = gl.createProgram();

    gl.attachShader(shader_program, vertex_shader!);
    gl.attachShader(shader_program, frag_shader!);
    gl.linkProgram(shader_program);

    if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
        alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shader_program,)}`,);
        return null;
    }

    return shader_program;
}

function init_position_buffer(gl: WebGL2RenderingContext): WebGLBuffer {
    const position_buffer: WebGLBuffer = gl.createBuffer();
    const positions: number[] = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

    gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return position_buffer;
}

function init_color_buffer(gl: WebGL2RenderingContext): WebGLBuffer {
    const colors: number[] = [
        1.0, 1.0, 1.0, 1.0,
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0
    ];

    const color_buffer: WebGLBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    return color_buffer;
}

function init_buffers(gl: WebGL2RenderingContext): Buffers {
    const position_buffer: WebGLBuffer = init_position_buffer(gl);
    const color_buffer: WebGLBuffer = init_color_buffer(gl);

    return {
        position: position_buffer,
        color: color_buffer
    };
}

function set_position_attribute(gl: WebGL2RenderingContext, buffers: Buffers, program_info: ProgramInfo): void {
    const num_components: number = 2; // 2 triangles
    const type = gl.FLOAT;
    const normalize: boolean = false;
    const stride: number = 0;
    const offset: number = 0;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        program_info.attrib_locations.vertex_position,
        num_components,
        type,
        normalize,
        stride,
        offset
    );

    gl.enableVertexAttribArray(program_info.attrib_locations.vertex_position);
}

function set_color_attribute(gl:WebGL2RenderingContext, buffers: Buffers, program_info: ProgramInfo): void {
    const num_components: number = 4;
    const type = gl.FLOAT;
    const normalize: boolean = false;
    const stride: number = 0;
    const offset: number = 0;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
        program_info.attrib_locations.vertex_colors,
        num_components,
        type,
        normalize,
        stride,
        offset
    );

    gl.enableVertexAttribArray(program_info.attrib_locations.vertex_colors);
}

function draw_scene(gl: WebGL2RenderingContext, program_info: ProgramInfo, buffers: Buffers, square_rotation: number): void {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const field_of_view = 45 * Math.PI / 180;
    const aspect = gl.canvas.width / gl.canvas.height;
    const z_near = 0.1;
    const z_far = 100.0;
    const proj = mat4.create();

    mat4.perspective(proj, field_of_view, aspect, z_near, z_far);

    const mvp = mat4.create();
    mat4.translate(mvp, mvp, [-0.0, 0.0, -6.0]);
    mat4.rotate(mvp, mvp, square_rotation, [0, 0, 1]);

    set_position_attribute(gl, buffers, program_info);
    set_color_attribute(gl, buffers, program_info);
    gl.useProgram(program_info.program);

    // set shaders
    gl.uniformMatrix4fv(
        program_info.uniform_locations.projection_matrix,
        false,
        proj
    );

    gl.uniformMatrix4fv(
        program_info.uniform_locations.mvp_matrix,
        false,
        mvp
    );

    const offset = 0;
    const vertex_count = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertex_count);
}

export default function WebGLComponent(): React.JSX.Element {
    const canvas_ref = React.useRef<HTMLCanvasElement>(null);
    const then = React.useRef<number>(0);
    const delta_time = React.useRef<number>(0);
    const square_rotation = React.useRef<number>(0);

    // Initialization Function
    React.useEffect(() => {
        const canvas: HTMLCanvasElement | null = canvas_ref.current;
        const gl: WebGL2RenderingContext | null = canvas!.getContext("webgl2");

        if (!gl) {
            console.error('WebGL2 not supported');
            return;
        }

        const program: WebGLProgram | null = init_shader_program(gl, vs_source, fs_source);
        const buffers: Buffers = init_buffers(gl);

        if (!program) {
            console.error("Error while initializing WebGLProgram object.");
            return;
        }

        const program_info: ProgramInfo = {
            program: program,
            attrib_locations: {
                vertex_position: gl.getAttribLocation(program, "aVertexPosition"),
                vertex_colors: gl.getAttribLocation(program, "aVertexColor")
            },
            uniform_locations: {
                projection_matrix: gl.getUniformLocation(program, "uProjectionMatrix"),
                mvp_matrix: gl.getUniformLocation(program, "uModelViewMatrix")
            }
        };

        const render_loop = (now: number) => {
            now *= 0.001;
            delta_time.current = now - then.current;
            then.current = now;

            draw_scene(gl, program_info, buffers, square_rotation.current);
            square_rotation.current += delta_time.current;
            requestAnimationFrame(render_loop);
        }

        requestAnimationFrame(render_loop);
    }, []);

    return (
        <div>
            <p>look at my cool canvas</p>
            <canvas id="webgl-target" ref={canvas_ref} height={200} className="webgl-canvas"></canvas>
        </div>
    )
}