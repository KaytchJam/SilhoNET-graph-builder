import { kGraph } from "./graph_utility/KGraph";
import type { MetaNode } from "./RenderGraph";

export interface GraphExporter {
    serialize(G: kGraph<MetaNode,string>): string;
    // deserialize(data: string): kGraph<MetaNode,string>; not really needed might do this after everything else
}

export class GraphMLExporter implements GraphExporter {
    /** Add an XML header for the GraphML format */
    private add_header() {
        return `<?xml version="1.0" encoding="UTF-8"?>\n<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns  http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n`;
    }
  
    /** Add an XML key-node */
    private add_key(id: string, gtarget: string, attr_name: string, attr_type: string): string {
        return `\t<key id="${id}" for="${gtarget}" attr.name="${attr_name}" attr.type="${attr_type}"/>\n`;
    }
    
    /** Add an XML Graph-node */
    private add_graph(id: string, edgedefault: string): string {
        return `\t<graph id="${id}" edgedefault="${edgedefault}">\n`;
    }

    /** Build an XML node-node */
    private add_node(G: kGraph<MetaNode, string>, node_idx: number): string {
        const weight: MetaNode = G.node_weight(node_idx);
        return `\t\t<node id="n${node_idx}">\n\t\t\t<data key="d0">${weight.name}</data>\n\t\t</node>\n`;
    }
    
    /** Build an XML edge-node */
    private add_edge(G: kGraph<MetaNode, string>, edge_idx: number): string {
        const weight: string = G.edge_weight(edge_idx);
        const link = G.edge_nodes(edge_idx);
        return `\t\t<edge id="e${edge_idx}" source="n${link.from_node}" target="n${link.to_node}">\n\t\t\t<data key="d1">${weight}</data>\n\t\t</edge>\n`;
    }

    /** Takes in a kGraph and serializes it into string form */
    public serialize(G: kGraph<MetaNode, string>): string {
        const N: number = G.num_nodes();
        const E: number = G.num_edges();
        
        let data: string = this.add_header();
        data += this.add_key("d0", "node", "name", "string");
        data += this.add_key("d1", "edge", "e-text", "string");
        data += this.add_graph("G", "directed");

        for (let i = 0; i < N; i++) {
            data += this.add_node(G, i);
        }
        
        for (let e = 0; e < E; e++) {
            data += this.add_edge(G, e);
        }

        data += "\t</graph>\n</graphml>";
        return data;
    }
}

export class DOTExporter implements GraphExporter {

    /** Take in a kGraph and serializes it into string form */
    serialize(G: kGraph<MetaNode, string>): string {
        const E: number = G.num_edges();

        let data: string = "strict digraph {\n";
        for (let e = 0; e < E; e++) {
            const link = G.edge_nodes(e);
            data += `\t${link.from_node} -> ${link.to_node}\n`;
        }

        return data + "}";
    }
}

export class JSONExporter implements GraphExporter {
    serialize(_: kGraph<MetaNode, string>): string {
        return "";
    }
}

