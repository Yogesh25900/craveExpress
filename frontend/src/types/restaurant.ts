export interface RestaurantLocation {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Restaurant {
  id: string;
  name: string;
  image: string;       // card thumbnail
  banner: string;      // detail page hero
  cuisineTypes: string[];   // ["Italian", "Pizza", "Comfort Food"]
  category: string;    // primary filter category id e.g. "pizza"
  rating: number;
  reviewCount: number;
  deliveryTime: string;     // "20-30 min"
  deliveryFee: number;      // 0 = free
  minOrder: number;
  isOpen: boolean;
  address: string;
  location?: RestaurantLocation;  // GeoJSON point [lng, lat]
  deliveryRadius?: number;        // km
  distance?: number;              // km from user — set by backend when lat/lng provided
  tags: string[];           // ["Top Rated", "Popular", "New"]
}

export interface MenuCategory {
  id: string;
  name: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;    // matches MenuCategory.id
  isPopular: boolean;
  isVeg: boolean;
  isAvailable?: boolean;  // undefined means available (legacy compat)
  addons: Addon[];
}

export interface Review {
  id: string;
  restaurantId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  avatarColor: string; // tailwind bg color class for avatar
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}
