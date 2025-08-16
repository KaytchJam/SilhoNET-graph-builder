
const glsl = (x: any) => x;

/** Vertex shader text for texture plane used in canvas background */
export const texture_plane_vs_text = glsl`
    attribute vec4 aVertexPosition;
    attribute vec2 aTexCoord;
    
    varying lowp vec2 texCoord;
    
    void main() {
        gl_Position = aVertexPosition;
        texCoord = aTexCoord;
    }
`;

/** Fragment shader text for texture plane used in canvas background */
export const texture_plane_fs_text = glsl`
    precision mediump float;
    varying lowp vec2 texCoord;
    
    uniform sampler2D uSampler;
    
    void main() {
        vec4 color = texture2D(uSampler, texCoord);
        vec4 white = vec4(1.0); // make the texture slightly white so it's easier to see the graph nodes
        gl_FragColor = mix(color, white, 0.4);
    }
`;

/** Vertex shader text for the Graph nodes on the canvas */
export const render_graph_vs_text = glsl`
    precision lowp float;

    attribute vec4 aVertexPosition;
    varying float vNodeIndex;

    void main() {
        const float width = 600.0;
        const float height = 400.0;

        float nx = aVertexPosition.x / width * 2.0 - 1.0;
        float ny = (height - aVertexPosition.y) / height * 2.0 - 1.0;

        vNodeIndex = aVertexPosition.z;
        gl_Position = vec4(nx, ny, 0.0, 1.0);
        gl_PointSize = 10.0;
    }
`;

/** Fragment shader text for the Graph nodes on the canvas */
export const render_graph_fs_text = glsl`
    precision lowp float;

    varying float vNodeIndex;
    uniform int uHoverIndex;
    uniform int uSelectedIndex;
    uniform int uIsVertex;

    void main() {
        int node_index = int(vNodeIndex);
        vec4 node_color = vec4(0.0, 0.0, 0.0, 1.0);

        if (bool(uIsVertex)) {
            if (node_index == uSelectedIndex) {
                node_color = vec4(1.0, 1.0, 1.0, 1.0);
            } else if (node_index == uHoverIndex) {
                node_color = vec4(0.5, 0.5, 0.5, 1.0);
            }
        }

        gl_FragColor = node_color;
    }
`;

/** Vertex Shader text for the user's cursor on the screen. */
export const user_mouse_vs_text = glsl`
    precision lowp float;
    attribute vec4 aVertexPosition;
    
    void main() {
        const float width = 600.0;
        const float height = 400.0;

        float nx = aVertexPosition.x / width * 2.0 - 1.0;
        float ny = (height - aVertexPosition.y) / height * 2.0 - 1.0; // flip axis

        gl_Position = vec4(nx, ny, 0.0, 1.0);
        gl_PointSize = 10.0;
    }
`;

/** Fragment Shader text for the user's cursor on the screen. */
export const user_mouse_fs_text = glsl`
    precision lowp float;

    void main() {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.5);
    }
`;