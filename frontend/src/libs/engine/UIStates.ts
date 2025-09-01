import type { EnumLike } from "../../utils/types/EnumLike";

export const ClickEnum = { 
    NONE: 0,
    LC_ADD_EDGE: 1, 
    LC_ADD_NODE: 2, 
    LC_SELECT_NODE: 3, 
    LC_DESELECT_NODE: 4,
} as const;

export type TClickEnum = EnumLike<typeof ClickEnum>;

/** Given an object indicating the node_picked and hover_node status, returns various left click enum states */
export function get_lc_states(selection_context: { node_picked: number | null, hover_node: number | null}): TClickEnum {
    const has_hovering: boolean = selection_context.hover_node !== null;
    const has_picked: boolean = selection_context.node_picked !== null;
    const same_node: boolean = has_hovering && has_picked && (selection_context.node_picked! === selection_context.hover_node!);

    let out: TClickEnum = ClickEnum.NONE;
    if (has_hovering && has_picked && !same_node) {
        out = ClickEnum.LC_ADD_EDGE;
    }
    else if (has_hovering && !has_picked) {
        out = ClickEnum.LC_SELECT_NODE;
    }
    else if (!has_hovering && has_picked) {
        out = ClickEnum.LC_DESELECT_NODE;
    }
    else if (!has_hovering && !has_picked) {
        out = ClickEnum.LC_ADD_NODE;
    }

    return out;
}
