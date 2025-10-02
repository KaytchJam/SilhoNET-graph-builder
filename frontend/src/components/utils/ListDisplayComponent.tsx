
/** 
 * Type taken in by a `ListDisplayComponent` as an argument.
 * 
 * @argument item_list - the list to be mapped over.
 * @argument renderFunc - function taking an item I from `item_list` and turning it into a `React.ReactNode`.
 */
type ListDisplayProps<T> = {
  item_list: T[];
  renderFunc: (item: T, index: number) => React.ReactNode;
};

/** Helper component for display lists of items and rendering them in particular ways. */
export function ListDisplayComponent<T>({ item_list, renderFunc }: ListDisplayProps<T>) {
    return item_list.map(renderFunc);
}