export type OrderStatus =
  | "placed"
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderAddon {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  image: string;
  price: number;          // base price
  quantity: number;
  selectedAddons: OrderAddon[];
}

export interface OrderAddress {
  id: string;
  label: string;          // "Home" | "Work" | "Other"
  street: string;
  city: string;
  zip: string;
}

export interface RiderLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantSlug?: string;
  restaurantName: string;
  restaurantImage: string;
  items: OrderItem[];
  status: OrderStatus;
  placedAt: string;               // ISO string
  estimatedDeliveryMins: number;
  address: OrderAddress;
  paymentMethod: "cod" | "card";
  subtotal: number;
  deliveryFee: number;
  discount: number;
  promoCode?: string;
  total: number;
  notes?: string;
  // Rider fields
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderLocation?: RiderLocation;
  assignedAt?: string;
}
