import type { EnumLike } from "./EnumLike"

// Index types
export type node_idx_t = number;
export type edge_idx_t = number;

// Link types
type EdgeLink = { outgoing: edge_idx_t, incoming: edge_idx_t };
type NodeLink = { from_node: node_idx_t, to_node: node_idx_t };

// Enums
export const EdgeEnum = { OUTGOING: 0,  INCOMING: 1 } as const;
export const NodeEnum = { FROM: 0, TO: 1 } as const;

type TEdgeEnum = EnumLike<typeof EdgeEnum>;
type TNodeEnum = EnumLike<typeof NodeEnum>;

// Constants
const MAX_INDEX: number = Number.MAX_SAFE_INTEGER;

// Node class
class kNode<N> {
    weight: N;
    next: EdgeLink;

    constructor(weight: N, next: EdgeLink) {
        this.weight = weight;
        this.next = next;
    }

    static linkless<N>(weight: N): kNode<N> {
        return new kNode<N>(
            weight, 
            { outgoing: MAX_INDEX, incoming: MAX_INDEX }
        );
    }

    index_edge_link(idx: TEdgeEnum): edge_idx_t {
        return idx == EdgeEnum.OUTGOING ? this.next.outgoing : this.next.incoming;
    }
};

// Edge class
class kEdge<E> {
    weight: E;
    nodes: NodeLink;
    next: EdgeLink;

    constructor(weight: E, nodes: NodeLink, next: EdgeLink) {
        this.weight = weight;
        this.nodes = nodes;
        this.next = next;
    }

    /** Constructs a kEdge<E> with sentinel values in its nodes and next fields. */
    static linkless<E>(weight: E): kEdge<E> {
        return new kEdge<E>(
            weight, 
            { from_node: MAX_INDEX, to_node: MAX_INDEX }, 
            { outgoing: MAX_INDEX, incoming: MAX_INDEX }
        );
    }

    index_edge_link(idx: TEdgeEnum): edge_idx_t {
        return idx == EdgeEnum.INCOMING ? this.next.incoming : this.next.outgoing;
    }

    index_node_link(idx: TNodeEnum): node_idx_t {
        return idx == NodeEnum.TO ? this.nodes.to_node : this.nodes.from_node;
    }
};

type EdgeData<E> = {
    node_idx: node_idx_t;
    edge_weight: E;
}

// interface IGraph {
//
// }

// Graph class
export class kGraph<N,E> {
    protected nodes: kNode<N>[];
    protected edges: kEdge<E>[];

    public constructor() {
        this.nodes = [];
        this.edges = [];
    }

    /** Adds a new node to the graph with weight of type `N`, where its index will be equal to this.num_nodes() prior
     * to the call of this function. */
    public add_node(weight: N): node_idx_t {
        const new_node_idx: node_idx_t = this.nodes.length;
        this.nodes.push(kNode.linkless(weight));
        return new_node_idx;
    }
    
    public add_nodes(...weights: N[]): { first_node: node_idx_t, number_of_nodes: number } {
        const ret_node_idx: node_idx_t = this.nodes.length;
        weights.forEach((w) => this.add_node(w));
        return { first_node: ret_node_idx, number_of_nodes: weights.length };
    }

    /** Returns the weight of node `a` provided that it's a valid index */
    public node_weight(a: node_idx_t): N {
        return this.nodes[a].weight;
    }

    /** Returns the weight of edge `e` provided that it's a valid index */
    public edge_weight(e: edge_idx_t): E {
        return this.edges[e].weight;
    }

    /** Returns the edge link of edge 'e' provided that it's a valid index */
    public edge_nodes(e: edge_idx_t): NodeLink {
        const link: NodeLink = this.edges[e].nodes;
        return { from_node: link.from_node, to_node: link.to_node };
    }
    
    /** Returns the number of _nodes_ in the graph. */
    public num_nodes(): number {
        return this.nodes.length;
    }
    
    /** Returns the number of _edges_ in the graph. */
    public num_edges(): number {
        return this.edges.length;
    }
    
    /** Connect two nodes `a` and `b` by an edge. Assumes a and b are distinct nodes AND that `a & b < this.num_nodes()` */
    public add_edge(a: node_idx_t, b: node_idx_t, weight: E): edge_idx_t {
        const new_edge_idx: edge_idx_t = this.edges.length;
        let new_edge: kEdge<E> = kEdge.linkless<E>(weight);
        
        let node_a: kNode<N> = this.nodes[a];
        let node_b: kNode<N> = this.nodes[b];
        
        new_edge.nodes = { from_node: a, to_node: b };
        new_edge.next = { outgoing: node_a.next.outgoing, incoming: node_b.next.incoming };
        
        node_a.next.outgoing = new_edge_idx;
        node_b.next.incoming = new_edge_idx;
        
        this.edges.push(new_edge);
        return new_edge_idx;
    }
    
    edge_to_str<E>(e: Readonly<kEdge<E>>): string {
        return "(" 
        + String(this.nodes[e.nodes.from_node].weight) + " -> " 
        + String(this.nodes[e.nodes.to_node].weight) + ", " + String(e.weight) 
        + ")";
    }
    
    edges_to_str(a: node_idx_t, direction: TEdgeEnum): string {
        let edge_str: string = String(this.nodes[a].weight) + " : [";
        let edge_idx: edge_idx_t = this.nodes[a].index_edge_link(direction);
        let edge_at: kEdge<E>;
        
        if (edge_idx != MAX_INDEX) {
            
            edge_at = this.edges[edge_idx];
            edge_str = edge_str.concat(this.edge_to_str(edge_at));
            edge_idx = edge_at.index_edge_link(direction);
            
            while (edge_idx != MAX_INDEX) {
                edge_at = this.edges[edge_idx];
                edge_str = edge_str.concat(", ", this.edge_to_str(edge_at));
                edge_idx = edge_at.index_edge_link(direction);
            }
        }
        
        return edge_str.concat("]");
    }
    
    /** Get the degree of some node `a` in some particular direction: `INGOING` or `OUTGOING`. 
     * These correspond to `IN-DEGREE` and `OUT-DEGREE`. */
    degree_by_dir(a: node_idx_t, direction: TEdgeEnum): number {
        let count: number = 0;
        let edge_idx: edge_idx_t = this.nodes[a].index_edge_link(direction);
        
        while (edge_idx != MAX_INDEX) {
            count += 1;
            edge_idx = this.edges[edge_idx].index_edge_link(direction);
        }
        
        return count;
    }
    
    /** Get the total degree of some node `a`. */
    degree(a: node_idx_t): number {
        return this.degree_by_dir(a, EdgeEnum.INCOMING) + this.degree_by_dir(a, EdgeEnum.OUTGOING);
    }

    /** Treats some edge in the graph at edge_idx_t `idx` as the "head" of a linked list of edges. Offers utility
     * functions to simplify iterating through a set of Edges. */
    EdgeList = class EdgeList implements Iterable<EdgeData<E>> {
        readonly idx: edge_idx_t;
        readonly parent: kGraph<N,E>;
        readonly dir: TEdgeEnum;
        readonly node_dir: TNodeEnum;

        constructor(idx: edge_idx_t, parent: kGraph<N,E>, dir: TEdgeEnum) {
            this.idx = idx;
            this.parent = parent;
            this.dir = dir;
            this.node_dir = this.dir === EdgeEnum.OUTGOING ? NodeEnum.TO : NodeEnum.FROM;
        }

        for_each(F: (value: EdgeData<E>, index: number | undefined) => void): void {
            let edge_idx: edge_idx_t = this.idx;
            let index: number = 0;

            while (edge_idx != MAX_INDEX) {
                const edge_at: kEdge<E> = this.parent.edges[edge_idx];
                F({node_idx: edge_at.index_node_link(this.node_dir), edge_weight: edge_at.weight}, index);
                edge_idx = this.parent.edges[edge_idx].index_edge_link(this.dir);
            }
        }

        /** Returns the edge direction of this EdgeList. */
        edge_direction(): TEdgeEnum {
            return this.dir;
        }

        /** Returns the node direction of this EdgeList. */
        node_direction(): TNodeEnum {
            return this.node_dir;
        }

        /** Iterator for an edge list starting at some edge_idx_t `idx`, dependant on some parent
         * kGraph<N,E> `parent`, and in direction `dir`. */
        [Symbol.iterator](): Iterator<EdgeData<E>> {
            let edge_idx: edge_idx_t = this.idx;
            return {
                next: () => {
                    if (edge_idx === MAX_INDEX) {
                        return { done: true, value: null }
                    }

                    const edge_at: kEdge<E> = this.parent.edges[edge_idx];
                    const value: EdgeData<E> = {
                        node_idx: edge_at.index_node_link(this.node_dir),
                        edge_weight: edge_at.weight
                    };

                    edge_idx = edge_at.index_edge_link(this.dir);
                    return { done: false, value };
                }
            }
        }

        /** Shorthand for `[Symbol.iterator]()` */
        iter(): Iterator<EdgeData<E>> {
            return this[Symbol.iterator]();
        }
    }
    
    /** Returns an `EdgeList` that spans over all incoming nodes & edges towards node `a` */
    incoming(a: node_idx_t): InstanceType<typeof this.EdgeList> {
        return new this.EdgeList(
            this.nodes[a].index_edge_link(EdgeEnum.INCOMING),
            this,
            EdgeEnum.INCOMING
        );
    }

    /** Returns an `EdgeList` that spans over all outgoing nodes & edges away from node `a` */
    outgoing(a: node_idx_t): InstanceType<typeof this.EdgeList> {
        return new this.EdgeList(
            this.nodes[a].index_edge_link(EdgeEnum.OUTGOING),
            this,
            EdgeEnum.OUTGOING
        );
    }

    /** Utility class that couples a `node_idx_t` with its associated `kGraph`.
     * Note that there may be pointer (or rather, index) invalidation in the
     * case that nodes are removed from its parent `kGraph`. */
    HeavyNode = class HeavyNode {
        readonly idx: node_idx_t;
        readonly parent: kGraph<N,E>;

        constructor(idx: node_idx_t, parent: kGraph<N,E>) {
            this.idx = idx;
            this.parent = parent;
        }

        /** Returns the data or 'weight' of this node. */
        data(): N {
            return this.parent.nodes[this.idx].weight;
        }

        set_data(new_weight: N): HeavyNode {
            this.parent.nodes[this.idx].weight = new_weight;
            return this;
        }
        
        map_data(M: (weight: N) => N) {
            this.parent.nodes[this.idx].weight = M(this.data());
        }

        /** Returns the index of this node. */
        index(): node_idx_t {
            return this.idx;
        }

        incoming(): InstanceType<typeof this.parent.EdgeList> {
            return this.parent.incoming(this.idx);
        }
        
        outgoing(): InstanceType<typeof this.parent.EdgeList> {
            return this.parent.outgoing(this.idx);
        }

    };

    /** Checks if node at `source` has an edge directed towards node `to` */
    has_outgoing_to(source: node_idx_t, to: node_idx_t): boolean {
        const outgoing_iter = this.outgoing(source)[Symbol.iterator]();
        let result = outgoing_iter.next();

        while (!result.done) {
            if (result.value.node_idx === to) {
                return true;
            }

            result = outgoing_iter.next();
        }
        
        return false;
    }

    /** Checks if node at `source` recieves an edge originating at node `from` */
    has_incoming_from(source: node_idx_t, from: node_idx_t): boolean {
        const incoming_iter = this.incoming(source)[Symbol.iterator]();
        let result = incoming_iter.next();

        while (!result.done) {
            if (result.value.node_idx === from) {
                return true;
            }

            result = incoming_iter.next();
        }

        return false;
    }

    /** "Wiff" because I can't use "with" as a parameter name. Checks if a directed edge
     * exists between the `source` node and the `wiff` node. */
    has_directed_wiff(source: node_idx_t, wiff: node_idx_t): boolean {
        const outgoing_iter = this.outgoing(source)[Symbol.iterator]();
        const incoming_iter = this.outgoing(source)[Symbol.iterator]();
        let result_out = outgoing_iter.next();
        let result_in = incoming_iter.next();

        while (!result_in.done || !result_out.done) {
            if (!result_in.done && result_in.value.node_idx === wiff) {
                return true;
            }

            if (!result_out.done && result_out.value.node_idx === wiff) {
                return true;
            }
        }

        return false;
    }

    // has_bi_directed_wiff(source: node_idx_t, wiff: node_idx_t) {}
    
    /** Returns the HeavyNode variant of some node `a`. */
    make_heavy(idx: node_idx_t): InstanceType<typeof this.HeavyNode> {
        return new this.HeavyNode(idx, this);
    }

    /** Clears all nodes and edges in this Graph */
    clear() {
        this.nodes = [];
        this.edges = [];
    }

    /** Just returns itself */
    prune(): kGraph<N,E> {
        return this;
    }

    // into_view(): IdentityView<N,E> {} ?
    // big question is how do views "compose" into each other?

    /** Return whether  */
    contains(n: node_idx_t): boolean {
        return n < this.nodes.length;
    }
};

// class VisitMap {
//     private visit_list: Int32Array;

//     constructor(G: kGraph<any,any>) {
//         this.visit_list = new Int32Array(G.num_nodes()).fill(-1);
//     }

//     /** Mark a node as visited, set a path distance */
//     public visit(n: node_idx_t, path_distance: number = 1) {
//         this.visit_list[n] = path_distance;
//     }

//     /** Returns whether a node has been visited or not */
//     public is_visited(n: node_idx_t): boolean {
//         return this.visit_list[n] > -1;
//     }

//     public distance(n: node_idx_t): number {
//         return this.visit_list[n];
//     }
// };

// type BFSData = {
//     node_idx: node_idx_t;
//     path_distance: number;
// };

// type PathDistance<N> = {
//     item: N;
//     distance: number;
// };


// class BFSMachine {
//     private queue: [node_idx_t, number][];
//     private visited: VisitMap;

//     constructor(G: kGraph<any,any>, start_node: node_idx_t) {
//         this.queue = [[start_node, 0]];
//         this.visited = new VisitMap(G);
//     }

//     /** Run a full BFS over graph G */
//     public run(G: kGraph<any,any>): BFSMachine {
//         while (this.queue.length > 0) {
//             const node_at: [node_idx_t, number] = this.queue.shift()!;
//             this.visited.visit(node_at[0], node_at[1]);

//             for (let edge_data of G.outgoing(node_at[0])) {
//                 if (!this.visited.is_visited(edge_data.node_idx)) {
//                     this.queue.push([edge_data.node_idx, node_at[1] + 1]);
//                 }
//             }
//         }

//         return this;
//     }

//     /** Runs a single BFS iteration. If the visit list is empty `null` is returned. Otherwise
//      * a BFSData is returned. */
//     public next(G: kGraph<any,any>): BFSData | null {
//         if (this.queue.length == 0) {
//             return null;
//         }

//         const node_at: [node_idx_t, number] = this.queue.shift()!;
//         const bfs_data: BFSData = { node_idx: node_at[0], path_distance: node_at[1] }; 
//         this.visited.visit(node_at[0], node_at[1]);

//         for (let edge_data of G.outgoing(node_at[0])) {
//             if (this.visited.is_visited(edge_data.node_idx)) {
//                 this.queue.push([edge_data.node_idx, node_at[1] + 1]);
//             }
//         }

//         return bfs_data;
//     }

//     public get_visit_map(): VisitMap {
//         return this.visited;
//     }

//     public empty(): boolean {
//         return this.queue.length == 0;
//     }
// };

// interface GraphView<N,E> {
//     prune(): any;
//     node_weight(): any;
//     contains: boolean;
// }

// class IdentityView<N,E> {
//     private inner: kGraph<N,E>;
//     constructor(G: kGraph<N,E>) {
//         this.inner = G;
//     }
// };

// class NodeView<N,E> {
//     private inner: kGraph<N,E>;
//     private mappings: VisitMap;

//     constructor(inner: kGraph<N,E>, centered: node_idx_t) {
//         this.inner = inner;
//         this.mappings = new BFSMachine(inner, centered).run(this.inner).get_visit_map();
//     }

//     /** Using `this.mappings` of this Graph View as a basis, construct a new `kGraph<Distance<N>,E>`, where its nodes
//      * are a subset of `this.inner`. One thing worth considering though is whether this can all be evaluated lazily, as the
//      * main thing here is producing the "mapping" */
//     prune(): kGraph<PathDistance<N>,E> {
//         const prune_graph: kGraph<PathDistance<N>,E> = new kGraph<PathDistance<N>,E>();
//         const g2g_map: Map<node_idx_t,node_idx_t> = new Map<node_idx_t,node_idx_t>();

//         // populate `prune_graph` with all the old nodes -> worst case O(N^2), avg case -> O(Nlog(N))
//         for (let old_idx = 0; old_idx < this.inner.num_nodes(); old_idx++) {
//             if (this.mappings.is_visited(old_idx)) {
//                 const new_idx = prune_graph.add_node({ item: this.inner.node_weight(old_idx), distance: this.mappings.distance(old_idx) });
//                 g2g_map.set(old_idx, new_idx);
//             }
//         }

//         // with old_idx -> new_idx mappings established, rebuild edges only if both nodes in `prune_graph` only
//         g2g_map.forEach((new_idx: node_idx_t, old_idx: node_idx_t) => {
//             for (let edge_data of this.inner.outgoing(old_idx)) {
//                 const target_idx: node_idx_t = edge_data.node_idx;
//                 if (this.mappings.is_visited(target_idx)) {
//                     prune_graph.add_edge(new_idx, g2g_map.get(target_idx)!, edge_data.edge_weight);
//                 }
//             }
//         });

//         return prune_graph;
//     }

//     // private build_mapping()

//     node_weight(n: node_idx_t): PathDistance<N> {
//         return { item: this.inner.node_weight(n), distance: this.mappings.distance(n) };
//     }

//     /** Return the path distance from the node the view is centered on to node `n` */
//     distance(n: node_idx_t): number {
//         return this.mappings.distance(n);
//     }

// };