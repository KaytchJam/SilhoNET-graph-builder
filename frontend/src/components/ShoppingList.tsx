import React from 'react';

/** Adds an item to the shop list */
function add_item(f: FormData, cur_list: string[], list_update_func: React.Dispatch<React.SetStateAction<string[]>>) {
    const item_text: string | undefined = f.get("shopping-list-text")?.toString();
    if (item_text !== undefined) {
        const item_text_trimmed: string = item_text.trim();
        console.log("Adding item: \'" + item_text_trimmed +"\'");
        cur_list.push(item_text_trimmed);
        list_update_func(cur_list.slice());
    }
}

/** Removes item at index 'i' from the shop list */
function remove_item(item_index: number, cur_list: string[], list_update_func: (a: React.SetStateAction<string[]>) => void) {
    const item_at: string = cur_list[item_index];
    const list_cleared: string[] = cur_list.filter((_, i: number) => { return i != item_index });

    console.log("Removed item at index " + item_index.toString() + ": " + item_at + ".");
    list_update_func(list_cleared);
}

type ShoplistItemData = {
    text: string,
    index: number
    removal_func: (item_index: number) => void | undefined
};

/** 
* Shopping Item component. 
*
* __TEXT__ is the displayed text shown by the item.
* __INDEX__ is the index location of the item in its parent "Shopping List" container.
* __REMOVAL FUNC__ is a function passed by the parent component that takes in this ShoppingItem's index and removes it.
*/
function ShopItem(data: ShoplistItemData) {
    return (
        <li className="shoplist-item" key={data.index}>
            <p>{data.text} <span><button onClick={()=>data.removal_func(data.index)}>X</button></span></p>
        </li>
    );
}

/** Converts a `string[]` into `ShopItem[]` (or more accurately `React.JSX.Element[]`) */
function to_shoplist(items: string[], rfunc: (idx: number) => void) {
    return items.map((s: string, i: number) => {
        return (
            <ShopItem text={s} index={i} removal_func={rfunc}/>
        )
    });
}

/** Shopping List component */
export default function ShoppingList(): React.JSX.Element {
    const [items, set_items] = React.useState<string[]>(() => []);
    return (
        <div>
            <p>Add an item to the shopping list.</p>
            <form action={(f: FormData) => add_item(f, items, set_items)}>
                <input name="shopping-list-text" type="text" placeholder='add a new shopping item' maxLength={25} required/>
                <input name="shopping-list-submit" type="submit" value="Add"/>
            </form>
            <div>
                <ul>
                    {to_shoplist(items, (idx: number) => remove_item(idx, items, set_items))}
                </ul>
            </div>
        </div>
    );
}