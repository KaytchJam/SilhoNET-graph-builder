import { kGraph, type IndexedGraph, type node_idx_t, type edge_idx_t, type IndexedNeighborhood } from "./KGraph";

class MetaGraph<N,E> implements IndexedGraph<N,E> {
    private attribute_map: Map<string,string[]>;
    private topology: kGraph<N,E>;

    public constructor() {
        this.attribute_map = new Map<string,string[]>();
        this.topology = new kGraph();
    }

    /** Returns whether the MetaGraph already "has" an attribute  */
    public has_attr(attr: string): boolean {
        return this.attribute_map.has(attr);
    }

    /** Adds a new attribute to the MetaGraph, where all values are set
     * to an empty string. If the attribute already exists, its 
     * previous value array is overwritten as empty strings. */
    public add_attr(attr: string): MetaGraph<N,E> {
        this.attribute_map = this.attribute_map.set(
            attr, 
            Array(this.attribute_map.values().next().value?.length).fill("")
        );

        return this;
    }

    /** Return all the values associated with a given attribute */
    public get_attr_values(attr: string): string[] | undefined {
        return this.attribute_map.get(attr);
    }

    /** Return the value of node at `node_index` along a given attribute `attr`.
     * Returns null if the attribute does not exist. */
    public node_attr(attr: string, node_index: node_idx_t): string | null {
        const attr_vals: string[] | undefined = this.attribute_map.get(attr);
        return attr_vals != undefined ? attr_vals[node_index] : null;
    }

    /** Return the value of node at `node_index` along a given attribute `attr` */
    public node_attr_unchecked(attr: string, node_index: node_idx_t): string {
        return this.attribute_map.get(attr)![node_index];
    }

    /** Adds a node & a new spot to the attribute map arrays */
    public add_node(weight: N): node_idx_t {
        let node_index = this.topology.add_node(weight);
        for (let [_, value] of this.attribute_map) { value.push(""); }
        return node_index;
    }

    /** Adds an edge */
    public add_edge(a: node_idx_t, b: node_idx_t, weight: E): edge_idx_t {
        let edge_index = this.topology.add_edge(a,b,weight);
        return edge_index;
    }

    public node_weight(n: node_idx_t): N {
        return this.topology.node_weight(n);
    }

    public edge_nodes(e: edge_idx_t): { from_node: node_idx_t; to_node: node_idx_t; } {
        return this.topology.edge_nodes(e);
    }

    public edge_weight(e: edge_idx_t): E {
        return this.topology.edge_weight(e);
    }

    public outgoing(n: node_idx_t): IndexedNeighborhood<E> {
        return this.topology.outgoing(n);
    }

    public incoming(n: node_idx_t): IndexedNeighborhood<E> {
        return this.topology.incoming(n);
    }

    public num_nodes(): number {
        return this.topology.num_nodes();
    }
}