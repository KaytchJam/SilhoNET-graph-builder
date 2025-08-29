import React from "react";
import { CircleInstance } from "../libs/engine/gui/Circle";
import { init_shader_program } from "../utils/webgl/shader_funcs"




/** Rendering many circles with our CircleInstance WITHOUT using Instanced Rendering */
function no_instance_scene(canvas: HTMLCanvasElement): void {
    /** Vertex Shader */
    const circle_shader_vs: string = `
    precision lowp float;
    
    attribute vec2 aVertexPosition;
    uniform vec2 uVertexOffset;
    
    void main() {
        const float width = 600.0;
        const float height = 400.0;
        
        float sX = aVertexPosition.x + uVertexOffset.x;
        float sY = aVertexPosition.y + uVertexOffset.y;
        float nx = sX / width * 2.0 - 1.0;
        float ny = (height - sY) / height * 2.0 - 1.0;
        
        gl_Position = vec4(nx, ny, 0.0, 1.0);
        }
    `;
    
        
    /** Fragment Shader */
    const circle_shader_fs: string = `
    precision lowp float;
    void main() {
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
        }
    `;
        
    const positions = [
        100.0, 200.0,
        150.0, 50.0,
        350.0, 100.0
    ];
            
    const gl: WebGL2RenderingContext = canvas.getContext("webgl2")!;
    const num_instances: number = positions.length / 2;
    const program: WebGLProgram = init_shader_program(gl, circle_shader_vs, circle_shader_fs)!;
    const vbo: WebGLBuffer = gl.createBuffer();
    const circle_inst = new CircleInstance(100, 20);
    
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, circle_inst.data(), gl.STATIC_DRAW);
    
    const aVPos = gl.getAttribLocation(program, "aVertexPosition"); 
    const uVOff = gl.getUniformLocation(program, "uVertexOffset");
    
    gl.vertexAttribPointer(
        aVPos,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(aVPos);
    
    const render_loop = (_ : number) => {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1.0);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // since we're not instancing we have to loop multiple times
        // to render multiple of the same object
        for (let i = 0; i < num_instances; i++) {
            const idx: number = i * 2;
            gl.uniform2f(uVOff, positions[idx], positions[idx + 1]);
            gl.drawArrays(gl.TRIANGLE_FAN, 0, circle_inst.num_points());
        }

        requestAnimationFrame(render_loop);
    };

    requestAnimationFrame(render_loop);
}

/** Rendering many circles with our circle instance WITH instanced rendering */
function with_instance_scene(canvas: HTMLCanvasElement): void {
    const circle_shader_instanced_vs: string = `
        precision lowp float;
    
        attribute vec2 aVertexPosition;
        attribute vec2 aVertexOffset;
    
        void main() {
            const float width = 600.0;
            const float height = 400.0;
    
            float sX = aVertexPosition.x + aVertexOffset.x;
            float sY = aVertexPosition.y + aVertexOffset.y;

            float nx = sX / width * 2.0 - 1.0;
            float ny = (height - sY) / height * 2.0 - 1.0;
    
            gl_Position = vec4(nx, ny, 0.0, 1.0);
        }
    `;

     /** Fragment Shader */
    const circle_shader_fs: string = `
    precision lowp float;
    void main() {
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
        }
    `;

    const circle_inst = new CircleInstance(100, 20);
    const positions: number[] = [
        100.0, 200.0,
        150.0, 50.0,
        350.0, 100.0
    ];

    const gl: WebGL2RenderingContext = canvas.getContext("webgl2")!;
    const num_instances: number = positions.length / 2;
    const program: WebGLProgram = init_shader_program(gl, circle_shader_instanced_vs, circle_shader_fs)!;
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
        2,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.enableVertexAttribArray(aVOff);
    gl.vertexAttribDivisor(aVOff, 1);

    const render = (_: number) => {
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
        // no_instance_scene(ref.current!);
        with_instance_scene(ref.current!);
    }, []);

    return (
        <div>
            <p>Hello world</p>
            <canvas ref={ref} width="600" height="400"></canvas>
        </div>
    );
}