
/** Load the passed in shader string. */
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

/** Initialize a shader program given a vertex shader string, fragment shader string, and WebGL2Rendering Context. If
 * the shader program is unable to load, NULL is returned. */
export function init_shader_program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | null {
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

/** creates a buffer, fills it with `data` and returns said buffer's id */
export function buffer_init<Buffer extends ArrayBufferView<ArrayBufferLike>>(context: WebGL2RenderingContext, target: GLenum, data: Buffer, usage: GLenum) {
    const buffer = context.createBuffer();
    context.bindBuffer(target, buffer);
    context.bufferData(target, data, usage);
    return buffer;
}

/** Create a buffer, bind it, and return the buffer. Passes no data into said buffer. */
export function buffer_init_empty(context: WebGL2RenderingContext, target: GLenum) {
    const buffer = context.createBuffer();
    context.bindBuffer(target, buffer);
    return buffer;
}

/** initializes multiples buffers (with the same target & usage parameters) and returns all their ids */
export function buffer_init_multiple<Buffer extends ArrayBufferView<ArrayBufferLike>>(context: WebGL2RenderingContext, target: GLenum, usage: GLenum, dataset: Buffer[]): WebGLBuffer[] {
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

export type AttribData = {
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
export function set_attrib_data(context: WebGL2RenderingContext, program: WebGLProgram, attrib: AttribData,
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
export function set_attrib_data_instanced(context: WebGL2RenderingContext, program: WebGLProgram, attrib: AttribData,
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

type UniformCallback = (gl: WebGL2RenderingContext, ul: WebGLUniformLocation) => void;

export function quick_uniform(gl: WebGL2RenderingContext, program: WebGLProgram, uniform_name: string, callback: UniformCallback): boolean {
    gl.useProgram(program);
    const loc = gl.getUniformLocation(program, uniform_name);
    if (loc !== null) {
        callback(gl, loc);
        return true;
    }

    console.error(`quick_uniform: Unable to find Uniform Location of ${uniform_name}...`);
    return false;
}