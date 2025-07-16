
const glsl = (x: any) => x;

export const texture_plane_vs_text = glsl`
    attribute vec4 aVertexPosition;
    attribute vec2 aTexCoord;
    
    varying lowp vec2 texCoord;
    
    void main() {
        gl_Position = aVertexPosition;
        texCoord = aTexCoord;
    }
`;
        
export const texture_plane_fs_text = glsl`
    precision mediump float;
    varying lowp vec2 texCoord;
    
    uniform sampler2D uSampler;
    
    void main() {
        vec4 color = texture2D(uSampler, texCoord);
        vec4 white = vec4(1.0);
        gl_FragColor = mix(color, white, 0.4);
    }
`;

export const render_graph_vs_text = glsl`
    attribute vec4 aVertexPosition;

    void main() {
        float width = 600.0;
        float height = 400.0;

        float nx = aVertexPosition.x / width * 2.0 - 1.0;
        float ny = (height - aVertexPosition.y) / height * 2.0 - 1.0;


        gl_Position = vec4(nx, ny, 0.0, 1.0);
        gl_PointSize = 10.0;
    }
`;

export const render_graph_fs_text = glsl`
    void main() {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
`;