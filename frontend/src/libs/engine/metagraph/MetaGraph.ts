import { kGraph, type IndexedGraph, type node_idx_t, type edge_idx_t, type IndexedNeighborhood } from "./KGraph";

export class MetaGraph<N,E> implements IndexedGraph<N,E> {
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

    public outgoing(n: node_idx_t): IndexedNeighborhood {
        return this.topology.outgoing(n);
    }

    public incoming(n: node_idx_t): IndexedNeighborhood {
        return this.topology.incoming(n);
    }

    public num_nodes(): number {
        return this.topology.num_nodes();
    }

    public num_edges(): number {
        return this.topology.num_edges();
    }

    public iter_keys(): MapIterator<string> {
        return this.attribute_map.keys();
    }

    NodeValues = class NodeValues implements Iterable<[string,string]> {
        readonly node_index: node_idx_t;
        readonly attribute_map: Map<string,string[]>;

        constructor(parent: MetaGraph<any,any>, node_index: node_idx_t) {
            this.attribute_map = parent.attribute_map;
            this.node_index = node_index;
        }

        /** Iterates through all values associated with `node_index` in
         * the attribute map of the parent `MetaGraph<any,any>`*/
        [Symbol.iterator](): Iterator<[string, string]> {
            const key_iterator = this.attribute_map[Symbol.iterator]();
            return {
                next: () => {
                    const result: IteratorResult<[string,string[]]> = key_iterator.next();
                    if (result.done === true) {
                        return { done: true, value: "" };
                    }

                    return { done: false, value: [result.value[0], result.value[1][this.node_index]] };
                }
            };
        }

        /** Shorthand for `[Symbol.iterator]()` */
        iter(): Iterator<[string,string]> {
            return this[Symbol.iterator]();
        }

        /** for each */
        for_each(F: (pair: [string,string], index: number | undefined) => void): void {
            let idx: number = 0;
            for (let p of this) {
                F(p, idx);
                idx += 1;
            }
        }
    }

    /** Creates an iterable construct: `NodeValues` that lets you iterate through all
     * attribute values associated with the Node at `node_index`. */
    public iter_node_values(node_index: node_idx_t): InstanceType<typeof this.NodeValues> {
        return new this.NodeValues(this, node_index);
    }

    /** Set the value of a node along a given attribute `attr` */
    public set_node_value(node_index: node_idx_t, attr: string, value: string): MetaGraph<N,E> {
        const attr_values: string[] = this.get_attr_values(attr)!;
        attr_values[node_index] = value;
        return this;
    }

    /** Will likely need to be reimplemented latter if we add node attributes, but atm not an issue */
    public remove_edge(e: edge_idx_t): void {
        this.topology.remove_edge(e);
    }

    /** Removes the node from the graph along with its associated attributes in `attribute_map`. */
    public remove_node(n: node_idx_t): void {
        const swap_target: node_idx_t = this.topology.num_nodes() - 1;
        if (swap_target !== n) {
            for (let attribute of this.iter_keys()) {
                const attr_list = this.attribute_map.get(attribute)!;
                attr_list[n] = attr_list[swap_target];
                attr_list.pop();
            }
        }

        this.topology.remove_node(n);
    }
}

/** Foo */
function foo(): void {
    let mg: MetaGraph<void,void> = new MetaGraph<void,void>();
    
    const a = mg.add_node();
    mg.add_node();
    mg.add_node();
    
    mg.add_attr("Name");
    mg.add_attr("Race");
    mg.add_attr("Height");
    mg.add_attr("Credit Score");
    
    mg.set_node_value(a, "Name", "Kelso");
    mg.set_node_value(a, "Race", "White");
    mg.set_node_value(a, "Height", "5'11");
    mg.set_node_value(a, "Credit Score", "900");
    
    
    for (let pair of mg.iter_node_values(a)) {
        console.log(pair);
    } 
}

foo();