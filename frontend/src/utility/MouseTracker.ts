import { user_mouse_vs_text, user_mouse_fs_text } from "./shader_utility/shader_strings";
import { init_shader_program } from "./shader_utility/shader_funcs";

export class MouseTracker {
    private position: [number, number];
    private program: WebGLProgram;
    private vao: WebGLVertexArrayObject;
    private vbo: WebGLBuffer;
    private dirty: boolean;

    constructor(gl: WebGL2RenderingContext) {
        let temp_program = init_shader_program(gl, user_mouse_vs_text, user_mouse_fs_text);
        if (temp_program === null) {
            console.error("Failed to load shader program");
            temp_program = 0;
        }

        this.program = temp_program;
        this.position = [0, 0];

        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();

        const aVPos = gl.getAttribLocation(this.program, "aVertexPosition");

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.position), gl.STATIC_DRAW)

        gl.vertexAttribPointer(
            aVPos,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.enableVertexAttribArray(aVPos);
        this.dirty = false;
    }

    public update_position(pos: [number, number]): MouseTracker {
        this.position = pos;
        this.dirty = true;
        return this;
    }

    private build_vertices(gl: WebGL2RenderingContext): void {
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.position), gl.STATIC_DRAW);
    }

    public draw(gl: WebGL2RenderingContext): void {
        if (this.dirty) {
            this.build_vertices(gl);
        }

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.POINTS, 0, 1);
    }
};