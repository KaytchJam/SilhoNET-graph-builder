import type { EnumLike } from "../../../utils/types/EnumLike";


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
export class kNode<N> {
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

    index_and_update_edge_link(idx: TEdgeEnum, e: edge_idx_t): void {
        if (idx === EdgeEnum.OUTGOING) { this.next.outgoing = e;}
        else { this.next.incoming = e; }
    }
};

// Edge class
export class kEdge<E> {
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

    index_and_update_edge_link(idx: TEdgeEnum, e: edge_idx_t): void {
        if (idx === EdgeEnum.OUTGOING) { this.next.outgoing = e;}
        else { this.next.incoming = e; }
    }

    index_node_link(idx: TNodeEnum): node_idx_t {
        return idx == NodeEnum.TO ? this.nodes.to_node : this.nodes.from_node;
    }
};

export type EdgeData = {
    node_idx: node_idx_t;
    edge_idx: edge_idx_t;
}

/** INTERFACES */

/** Represents a neighborhood of a given node roughly */
export interface IndexedNeighborhood {
    for_each(F: (value: EdgeData, index: number | undefined) => void): void;
    contains(n: node_idx_t): boolean;
    [Symbol.iterator](): Iterator<EdgeData>;
}

/** Represents a graph roughly */
export interface IndexedGraph<N,E> {
    add_node(w: N): node_idx_t;
    add_edge(a: node_idx_t, b: node_idx_t, w: E): edge_idx_t;

    node_weight(n: node_idx_t): N;
    edge_weight(e: edge_idx_t): E;
    edge_nodes(e: edge_idx_t): NodeLink;

    outgoing(n: node_idx_t): IndexedNeighborhood;
    incoming(n: node_idx_t): IndexedNeighborhood;

    num_nodes(): number;
    num_edges(): number;
}

// interface IGraph {
    //
    // }
    
    // Graph class
export class kGraph<N,E> implements IndexedGraph<N,E> {
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
    
    /** Construct an "empty graph" i.e. a graph with no edges from an array  */
    public static nodes_from<N,E>(weights: N[]): kGraph<N,E> {
        const linkless_graph: kGraph<N,E> = new kGraph<N,E>();
        linkless_graph.add_nodes(...weights);
        return linkless_graph;
    }

    /** Returns the weight of node `a` provided that it's a valid index */
    public node_weight(a: node_idx_t): N {
        return this.nodes[a].weight;
    }

    public get_node(a: node_idx_t): kNode<N> {
        return this.nodes[a];
    }

    /** Applies function `F` to node n's weight and sets the result as node n's
     * new weight. */
    public node_map_weight(n: node_idx_t, F: (weight: N) => N): void {
        this.nodes[n].weight = F(this.nodes[n].weight);
    }

    /** Returns the weight of edge `e` provided that it's a valid index */
    public edge_weight(e: edge_idx_t): E {
        return this.edges[e].weight;
    }

    public get_edge(e: edge_idx_t): kEdge<E> {
        return this.edges[e];
    }

    public edge_map_weight(e: edge_idx_t, F: (weight: E) => E): void {
        this.edges[e].weight = F(this.edges[e].weight);
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
    public degree_by_dir(a: node_idx_t, direction: TEdgeEnum): number {
        let count: number = 0;
        let edge_idx: edge_idx_t = this.nodes[a].index_edge_link(direction);
        
        while (edge_idx != MAX_INDEX) {
            count += 1;
            edge_idx = this.edges[edge_idx].index_edge_link(direction);
        }
        
        return count;
    }
    
    /** Get the total degree of some node `a`. */
    public degree(a: node_idx_t): number {
        return this.degree_by_dir(a, EdgeEnum.INCOMING) + this.degree_by_dir(a, EdgeEnum.OUTGOING);
    }

    /** Treats some edge in the graph at edge_idx_t `idx` as the "head" of a linked list of edges. Offers utility
     * functions to simplify iterating through a set of Edges. */
    EdgeList = class EdgeList implements Iterable<EdgeData>, IndexedNeighborhood {
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

        for_each(F: (value: EdgeData, index: number | undefined) => void): void {
            let edge_idx: edge_idx_t = this.idx;
            let index: number = 0;

            while (edge_idx != MAX_INDEX) {
                const edge_at: kEdge<E> = this.parent.edges[edge_idx];
                F({node_idx: edge_at.index_node_link(this.node_dir), edge_idx }, index);
                edge_idx = this.parent.edges[edge_idx].index_edge_link(this.dir);
            }
        }

        /** Returns the edge direction of this EdgeList. */
        edge_direction(): TEdgeEnum {
            return this.dir;
        }

        empty(): boolean {
            return this.idx === MAX_INDEX;
        }

        /** Returns the node direction of this EdgeList. */
        node_direction(): TNodeEnum {
            return this.node_dir;
        }

        /** Iterator for an edge list starting at some edge_idx_t `idx`, dependant on some parent
         * kGraph<N,E> `parent`, and in direction `dir`. */
        [Symbol.iterator](): Iterator<EdgeData> {
            let edge_idx: edge_idx_t = this.idx;
            return {
                next: () => {
                    if (edge_idx === MAX_INDEX) {
                        return { done: true, value: null }
                    }

                    const edge_at: kEdge<E> = this.parent.edges[edge_idx];
                    const value: EdgeData = {
                        node_idx: edge_at.index_node_link(this.node_dir),
                        edge_idx
                    };

                    edge_idx = edge_at.index_edge_link(this.dir);
                    return { done: false, value };
                }
            }
        }

        public front_edge(): edge_idx_t {
            return this.idx;
        }

        /** Shorthand for `[Symbol.iterator]()` */
        public iter(): Iterator<EdgeData> {
            return this[Symbol.iterator]();
        }

        /** Returns whether a node in this neighborhood has edge_idx_t */
        public contains(n: node_idx_t): boolean {
            for (let value of this) {
                if (value.node_idx === n) {
                    return true;
                }
            }

            return false;
        }

        /** Returns the index of the first edge_idx satisfying `predicate` */
        public find_if(predicate: (n: node_idx_t, e: edge_idx_t, dir: TEdgeEnum) => boolean): EdgeData | null {
            for (let value of this) {
                if (predicate(value.node_idx, value.edge_idx, this.dir)) {
                    return value;
                }
            }
            return null;
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
    public has_outgoing_to(source: node_idx_t, to: node_idx_t): boolean {
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
    public has_incoming_from(source: node_idx_t, from: node_idx_t): boolean {
        const incoming_iter = this.incoming(source)[Symbol.iterator]();
        let result: IteratorResult<EdgeData, any> = incoming_iter.next();

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
    public has_directed_wiff(source: node_idx_t, wiff: node_idx_t): boolean {
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
    public clear() {
        this.nodes = [];
        this.edges = [];
    }

    /** Just returns itself */
    prune(): kGraph<N,E> {
        return this;
    }

    /** Return whether  */
    public contains(n: node_idx_t): boolean {
        return n < this.nodes.length;
    }

    /** Returns true if `e`'s next edge in the direction `dir` is `f`.  */
    private edge_is_prior(e: edge_idx_t, f: edge_idx_t, dir: TEdgeEnum): boolean {
        return this.edges[e].index_edge_link(dir) === f || e === f;
    }

    /** Removes edge `e` from node `parent`'s Edge List in the direction of `branch`. The return 
     * value yields true if `e` was successfully removed from `parent`'s edge list, and false 
     * if the operation was unsuccessful. */
    private disown(parent: node_idx_t, e: edge_idx_t, branch: TEdgeEnum): boolean {
        const get_edge_list = (branch === EdgeEnum.OUTGOING) ? this.outgoing : this.incoming;
        const younger_kin: EdgeData | null = get_edge_list
            .call(this, parent)
            .find_if((_, cur_e, dir) => this.edge_is_prior(cur_e, e, dir));

        let was_disowned = false;
        if (younger_kin !== null) {
            was_disowned = true;
            if (younger_kin.edge_idx === e) {
                this.nodes[parent]
                    .index_and_update_edge_link(branch, this.edges[e].index_edge_link(branch));
            } else {
                this.edges[younger_kin.edge_idx]
                    .index_and_update_edge_link(branch, this.edges[e].index_edge_link(branch));
            }
        }

        return was_disowned;
    }

    /** Replaces some edge `e` on the `branch` direction of node `parent`'s EdgeList with some
     * edge_idx_t `imposter`. */
    private rebrand(parent: node_idx_t, e: edge_idx_t, imposter: edge_idx_t, branch: TEdgeEnum): boolean {
        const get_edge_list = (branch === EdgeEnum.OUTGOING) ? this.outgoing : this.incoming;
        const younger_kin: EdgeData | null = get_edge_list
            .call(this, parent)
            .find_if((_, cur_e, dir) => this.edge_is_prior(cur_e, e, dir));

        let was_replaced = false;
        if (younger_kin !== null) {
            was_replaced = true;
            if (younger_kin.edge_idx === e) {
                this.nodes[parent]
                    .index_and_update_edge_link(branch, imposter);
            } else {
                this.edges[younger_kin.edge_idx]
                    .index_and_update_edge_link(branch, imposter);
            }
        }

        return was_replaced;
    }

    /** Make an edge disowned by both of its parent nodes in the incoming
     * and outgoing direction. */
    private make_disowned(e: edge_idx_t): kGraph<N,E> {
        const e_parent = this.edge_nodes(e);
        this.disown(e_parent.from_node, e, EdgeEnum.OUTGOING);
        this.disown(e_parent.to_node, e, EdgeEnum.INCOMING);
        return this;
    }

    /** Make an edge "rebranded" (i.e. change the edge index associated with it)
     * by both of its parent nodes in the incoming and outgoing direction */
    private make_rebranded(e: edge_idx_t, substitute: edge_idx_t): kGraph<N,E> {
        const e_parent = this.edge_nodes(e);
        this.rebrand(e_parent.from_node, e, substitute, EdgeEnum.OUTGOING);
        this.rebrand(e_parent.to_node, e, substitute, EdgeEnum.INCOMING);
        return this;
    }

    private static swap_indices<C extends Array<any>>(container: C, i1: number, i2: number) {
        const temp = container[i1];
        container[i1] = container[i2];
        container[i2] = temp;
    }

    /** Removes edge `e` from this graph */
    public remove_edge(e: edge_idx_t) {
        this.make_disowned(e);
        const l: edge_idx_t = this.edges.length - 1;
        if (e != l) {
            this.make_rebranded(l, e);
            kGraph.swap_indices(this.edges, l, e);
        }

        this.edges.pop();
    }

    private disown_edges(parent: node_idx_t) {
        // Outgoing direction
        let edge_neighborhood = this.outgoing(parent);
        while (!edge_neighborhood.empty()) {
            const e: edge_idx_t = edge_neighborhood.front_edge();
            const next_idx: edge_idx_t = this.edges[e].next.outgoing;

            this.disown(this.edges[e].nodes.to_node, e, EdgeEnum.INCOMING);
            const l: edge_idx_t = this.edges.length - 1;
            if (e != l) {
                this.make_rebranded(l, e);
                kGraph.swap_indices(this.edges, l, e);
            }

            this.nodes[parent].next.outgoing = next_idx;
            this.edges.pop();
            edge_neighborhood = this.outgoing(parent);
        }

        // Incoming direction
        edge_neighborhood = this.incoming(parent);
        while (!edge_neighborhood.empty()) {
            const e: edge_idx_t = edge_neighborhood.front_edge();
            const next_idx: edge_idx_t = this.edges[e].next.incoming;

            this.disown(this.edges[e].nodes.from_node, e, EdgeEnum.OUTGOING);
            const l: edge_idx_t = this.edges.length - 1;
            if (e != l) {
                this.make_rebranded(l, e);
                kGraph.swap_indices(this.edges, l, e);
            }

            this.nodes[parent].next.incoming = next_idx;
            this.edges.pop();
            edge_neighborhood = this.incoming(parent);
        }
    }

    /** Associate node `e` with a new index `imposter`. All edges that reference node `e` as
     * and index in field `node` have `node.to` or `node.from` set to `imposter`. */
    private rebrand_node(e: edge_idx_t, imposter: edge_idx_t) {
        let neighborhood = this.outgoing(e);
        for (let edge_data of neighborhood) {
            const e: edge_idx_t = edge_data.edge_idx;
            this.edges[e].nodes.from_node = imposter;
        }

        neighborhood = this.incoming(e);
        for (let edge_data of neighborhood) {
            const e: edge_idx_t = edge_data.edge_idx;
            this.edges[e].nodes.to_node = imposter;
        }
    }

    public remove_node(n: node_idx_t) {
        this.disown_edges(n);
        const f: node_idx_t = this.nodes.length - 1;
        if (n != f) {
            this.rebrand_node(f, n);
            kGraph.swap_indices(this.nodes, f, n);
        }
        this.nodes.pop();
    }
};