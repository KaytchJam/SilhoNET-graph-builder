import React from "react";
import { Link } from "react-router-dom";

export function WelcomePage(): React.JSX.Element {
    const graphml_link = <a href="http://graphml.graphdrawing.org/specification.html" target="_blank">GraphML</a>;
    const dot_link = <a href="https://graphviz.org/doc/info/lang.html" target="_blank">DOT</a>;
    const json_link = <a href="https://www.json.org/json-en.html" target="_blank">JSON</a>;
    const graph_link = <a href="https://en.wikipedia.org/wiki/Graph_(abstract_data_type)" target="_blank">graph</a>;

    return (
        <div id="welcome-div-body">

            <div id="welcome-div-logo">
                <img src="/silhonet_silho_text.svg" id="silhoNET-silho"></img>
                <img src="/silhonet_net_text.svg" id="silhoNET-net"></img>
            </div>

            <div id="welcome-div-about">
                <h2>What is Silho<strong>NET</strong>?</h2>

                <p>
                    <strong>SilhoNET</strong> is a simple GUI-based {graph_link} construction tool. Pass an image in as input,
                    draw a network over it, and finally: export the graph in various formats. At the moment, the graphs that
                    can be made are directed graphs with no self-cycles. That is, no vertex/node can have an edge pointing
                    towards itself. The current export formats supported by SilhoNET are {graphml_link}, {dot_link}, and {json_link}.
                </p>

                <p>
                    This site was made with React, Vite, and WebGL2. The shackles have been broken. Wield the tool. It bends to 
                    your will. Think of your enemy, and the power to defeat them is yours! [groan].
                </p>
                <div id="welcome-div-get-started">
                    <Link to="/engine">Get started.</Link>
                </div>
            </div>

        </div>
    );
}