import { kGraph } from "./graph_utility/KGraph";
import type { MetaNode } from "./RenderGraph";

interface GraphExporter {
    serialize(G: kGraph<MetaNode,string>): string;
    // deserialize(data: string): kGraph<MetaNode,string>;
}

export class GraphMLExporter implements GraphExporter {
  
    /** Add an XML key-node */
    private add_key(id: string, gtarget: string, attr_name: string, attr_type: string): string {
        return `<key id="${id}" for="${gtarget}" attr.name="${attr_name}" attr.type="${attr_type}">\n`;
    }
    
    /** Add an XML Graph-node */
    private add_graph(id: string, edgedefault: string): string {
        return `<graph id="${id}" edgedefault="${edgedefault}">\n`;
    }

    /** Build an XML node-node */
    private build_node(G: kGraph<MetaNode, string>, node_idx: number): string {
        const weight: MetaNode = G.node_weight(node_idx);
        return `\t<node id="n${node_idx}">\n\t\t<data key="d0">${weight.name}</data>\n\t</node>\n`;
    }
    
    /** Build an XML edge-node */
    private build_edge(G: kGraph<MetaNode, string>, edge_idx: number): string {
        const weight: string = G.edge_weight(edge_idx);
        const link = G.edge_nodes(edge_idx);
        return `\t<edge id="e${edge_idx}" source="n${link.from_node}" target="n${link.to_node}">\n\t\t<data key="d1">${weight}</data>\n\t</edge>\n`;
    }

    /** Takes in a kGraph and serializes it into string form */
    public serialize(G: kGraph<MetaNode, string>): string {
        const N: number = G.num_nodes();
        const E: number = G.num_edges();
        
        let data: string = this.add_key("d0", "node", "name", "string");
        data += this.add_key("d1", "edge", "e-text", "string");
        data += this.add_graph("G", "directed");

        for (let i = 0; i < N; i++) {
            data += this.build_node(G, i);
        }
        
        for (let e = 0; e < E; e++) {
            data += this.build_edge(G, e);
        }

        data += "</graph>\n";
        return data;
    }
}

