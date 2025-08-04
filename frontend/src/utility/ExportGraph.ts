import { kGraph } from "./graph_utility/KGraph";
import type { DrawNode } from "./RenderGraph";

export interface MetaGraphExporter {
    serialize(G: kGraph<DrawNode,string>, metamap: Map<string,string[]>): string;
    // deserialize(data: string): kGraph<MetaNode,string>; not really needed might do this after everything else
}

export class GraphMLExporter implements MetaGraphExporter {
    /** Add an XML header for the GraphML format */
    private add_header() {
        return `<?xml version="1.0" encoding="UTF-8"?>\n<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns  http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n`;
    }

    /** Add an XML key-node */
    private static add_key(id: string, gtarget: string, attr_name: string, attr_type: string): string {
        return `\t<key id="${id}" for="${gtarget}" attr.name="${attr_name}" attr.type="${attr_type}"/>\n`;
    }

    /** Add XML key-nodes based on the keys in `metamap` */
    private static add_node_keys(metamap: Map<string,string[]>) {
        let keyset: string = "";
        let enumerate: number = 0;

        for (let [keyname, _] of metamap) {
            keyset += GraphMLExporter.add_key(`d${enumerate}`, "node", keyname, "string");
        }

        return keyset;
    }
    
    /** Add an XML Graph-node */
    private static add_graph(id: string, edgedefault: string): string {
        return `\t<graph id="${id}" edgedefault="${edgedefault}">\n`;
    }

    /** Build an XML node-node */
    private static add_node(node_idx: number, metalist: string[]): string {
        return `\t\t<node id="n${node_idx}">\n\t\t\t<data key="d0">${metalist[node_idx]}</data>\n\t\t</node>\n`;
    }
    
    /** Build an XML edge-node */
    private add_edge(G: kGraph<DrawNode, string>, edge_idx: number): string {
        const weight: string = G.edge_weight(edge_idx);
        const link = G.edge_nodes(edge_idx);
        return `\t\t<edge id="e${edge_idx}" source="n${link.from_node}" target="n${link.to_node}">\n\t\t\t<data key="d1">${weight}</data>\n\t\t</edge>\n`;
    }

    /** Takes in a kGraph and serializes it into string form */
    public serialize(G: kGraph<DrawNode, string>, metamap: Map<string,string[]>): string {
        const N: number = G.num_nodes();
        const E: number = G.num_edges();
        
        let data: string = this.add_header();
        data += GraphMLExporter.add_node_keys(metamap);
        data += GraphMLExporter.add_key("d1", "edge", "e-text", "string");
        data += GraphMLExporter.add_graph("G", "directed");

        // O(N * A) where N is the number of graph nodes & A is the number of attributes
        for (let i = 0; i < N; i++) {
            for (let [_, list] of metamap) {
                data += GraphMLExporter.add_node(i, list);
            }
        }
        
        for (let e = 0; e < E; e++) {
            data += this.add_edge(G, e);
        }

        data += "\t</graph>\n</graphml>";
        return data;
    }
}

export class DOTExporter implements MetaGraphExporter {
    /** Take in a kGraph and serializes it into string form */
    serialize(G: kGraph<DrawNode, string>, _: Map<string,string[]>): string {
        const E: number = G.num_edges();

        let data: string = "strict digraph {\n";
        for (let e = 0; e < E; e++) {
            const link = G.edge_nodes(e);
            data += `\t${link.from_node} -> ${link.to_node}\n`;
        }

        return data + "}";
    }
}

export class JSONExporter implements MetaGraphExporter {
    serialize(g: kGraph<DrawNode, string>, _: Map<string,string[]>): string {
        return "";
    }
}

