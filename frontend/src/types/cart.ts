import type { Addon } from "./restaurant";

export interface CartItem {
  cartItemId: string;       // unique id per cart entry (menuItemId + addons hash)
  menuItemId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  price: number;            // base price
  image: string;
  quantity: number;
  selectedAddons: Addon[];  // chosen add-ons for this entry
}

export interface Cart {
  items: CartItem[];
  itemCount: number;        // total units across all items
  subtotal: number;         // sum of (price + addons) × qty
}
