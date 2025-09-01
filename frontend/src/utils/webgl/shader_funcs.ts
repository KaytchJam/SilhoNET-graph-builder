
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