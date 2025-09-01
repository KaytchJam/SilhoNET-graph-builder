import { init_shader_program } from "../../../utils/webgl/shader_funcs";
import { texture_plane_vs_text, texture_plane_fs_text } from "../../../shaders/shader_strings";
        
export class TexturePlane {
    length: number;
    height: number;
    texture: WebGLTexture;
    program: WebGLProgram;
    vao: WebGLVertexArrayObject;
            
    static load_texture(gl: WebGL2RenderingContext, img_in: HTMLImageElement, program: WebGLProgram): WebGLTexture {
        const texture: WebGLTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGB,
            img_in.width,
            img_in.height,
            0,
            gl.RGB,
            gl.UNSIGNED_BYTE,
            img_in
        );

        gl.generateMipmap(gl.TEXTURE_2D);
        gl.useProgram(program);
        const sampler_location: WebGLUniformLocation | null = gl.getUniformLocation(program, "uSampler");
        if (!sampler_location) {
            console.log(`Error while trying to find uniform location of ${"uSampler"}`);
        }

        gl.uniform1i(sampler_location, texture as number);
        return texture;
    }

    static init_vao(gl: WebGL2RenderingContext, program: WebGLProgram): WebGLVertexArrayObject {
        const vertices: number[] = [
            1.0, 1.0, 1.0, 1.0, // VERTEX POSITION (0-1), TEXTURE COORDINATE (2-3)
            -1.0, 1.0, 0.0, 1.0,
            1.0, -1.0, 1.0, 0.0,
            -1.0, -1.0, 0.0, 0.0
        ];
        const indices: number[] = [0, 1, 2, 2, 3, 1];

        const vao: WebGLVertexArrayObject = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const txt_coords: WebGLBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, txt_coords);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        const txt_indices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, txt_indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

        gl.useProgram(program);
        const buffer_location: number = gl.getAttribLocation(program, "aVertexPosition");
        gl.vertexAttribPointer(
            buffer_location,
            2,
            gl.FLOAT,
            false,
            16,
            0
        );
        gl.enableVertexAttribArray(buffer_location);

        const texcoord_location: number = gl.getAttribLocation(program, "aTexCoord");
        gl.vertexAttribPointer(
            texcoord_location,
            2,
            gl.FLOAT,
            false,
            16,
            8
        );
        gl.enableVertexAttribArray(texcoord_location);

        return vao;
    }

    constructor(gl: WebGL2RenderingContext, img_in: HTMLImageElement) {
        this.length = gl.canvas.width;
        this.height = gl.canvas.height;

        this.program = init_shader_program(gl, texture_plane_vs_text, texture_plane_fs_text)!;
        this.vao = TexturePlane.init_vao(gl, this.program);
        this.texture = TexturePlane.load_texture(gl, img_in, this.program);
    }

    public draw(gl: WebGL2RenderingContext): void {
        gl.bindVertexArray(this.vao);
        gl.useProgram(this.program);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);
    }
}