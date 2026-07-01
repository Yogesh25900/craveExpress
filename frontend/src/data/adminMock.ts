// Mock data for the Admin panel (Sprint 4 frontend).
// Replace all data with real API calls when wiring backend in Sprint 4.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "user" | "owner" | "admin";
  restaurantId?: string;
  restaurantName?: string;
  orders: number;
  joined: string;
  status: "active" | "banned";
}

export interface AdminRestaurant {
  id: string;
  name: string;
  image: string;
  category: string;
  ownerId?: string;
  ownerName?: string;
  orders: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  isActive: boolean;
  address: string;
  joinedAt: string;
}

export type AdminOrderStatus = "placed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  restaurantId: string;
  restaurantName: string;
  items: { name: string; qty: number }[];
  total: number;
  status: AdminOrderStatus;
  paymentMethod: "card" | "cash";
  placedAt: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  restaurantName: string;
  amount: number;
  method: "card" | "cash";
  status: "paid" | "refunded" | "failed";
  date: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  description: string;
}

export interface PlatformCategory {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  restaurantCount: number;
  isActive: boolean;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultDeliveryFee: number;
  defaultMinOrder: number;
  commissionRate: number;
  maintenanceMode: boolean;
  allowGuestCheckout: boolean;
  maxDeliveryRadius: number;
}

// ── helpers ────────────────────────────────────────────────────────────────────

function daysAgo(d: number, h = 12): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(h, 0, 0, 0);
  return dt.toISOString();
}
function minsAgo(m: number): string {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

// ── Users ─────────────────────────────────────────────────────────────────────

export const adminUsers: AdminUser[] = [
  { id: "u-001", fullName: "Alex Carter",      email: "admin@craveexpress.com", phone: "+1 (555) 000-0001", role: "admin",  orders: 0,  joined: daysAgo(180), status: "active" },
  { id: "u-002", fullName: "Marco Russo",       email: "marco@luigis.com",       phone: "+1 (555) 000-0002", role: "owner",  restaurantId: "luigis-pizzeria",  restaurantName: "Luigi's Pizzeria",    orders: 0,  joined: daysAgo(120), status: "active" },
  { id: "u-003", fullName: "Sam Torres",        email: "sam@burgerjoint.com",     phone: "+1 (555) 000-0003", role: "owner",  restaurantId: "burger-joint",     restaurantName: "The Burger Joint",   orders: 0,  joined: daysAgo(95),  status: "active" },
  { id: "u-004", fullName: "Anika Sharma",      email: "anika@greenbowl.com",     phone: "+1 (555) 000-0004", role: "owner",  restaurantId: "green-bowl",       restaurantName: "Green Bowl",         orders: 0,  joined: daysAgo(88),  status: "active" },
  { id: "u-005", fullName: "Kenji Watanabe",    email: "kenji@sakura.com",        phone: "+1 (555) 000-0005", role: "owner",  restaurantId: "sakura-sushi",     restaurantName: "Sakura Sushi",       orders: 0,  joined: daysAgo(60),  status: "active" },
  { id: "u-006", fullName: "John Doe",          email: "john@example.com",        phone: "+1 (555) 101-0001", role: "user",   orders: 14, joined: daysAgo(90),  status: "active" },
  { id: "u-007", fullName: "Sarah Miller",      email: "sarah@example.com",       phone: "+1 (555) 101-0002", role: "user",   orders: 7,  joined: daysAgo(45),  status: "active" },
  { id: "u-008", fullName: "Mike Chen",         email: "mike@example.com",        phone: "+1 (555) 101-0003", role: "user",   orders: 22, joined: daysAgo(120), status: "active" },
  { id: "u-009", fullName: "Lisa Wong",         email: "lisa@example.com",        phone: "+1 (555) 101-0004", role: "user",   orders: 3,  joined: daysAgo(15),  status: "active" },
  { id: "u-010", fullName: "Raj Patel",         email: "raj@example.com",         phone: "+1 (555) 101-0005", role: "user",   orders: 11, joined: daysAgo(60),  status: "active" },
  { id: "u-011", fullName: "Emma Davis",        email: "emma@example.com",        phone: "+1 (555) 101-0006", role: "user",   orders: 5,  joined: daysAgo(30),  status: "active" },
  { id: "u-012", fullName: "James Wilson",      email: "james@example.com",       phone: "+1 (555) 101-0007", role: "user",   orders: 18, joined: daysAgo(200), status: "active" },
  { id: "u-013", fullName: "Nina Garcia",       email: "nina@example.com",        phone: "+1 (555) 101-0008", role: "user",   orders: 9,  joined: daysAgo(70),  status: "active" },
  { id: "u-014", fullName: "Carlos Brown",      email: "carlos@example.com",      phone: "+1 (555) 101-0009", role: "user",   orders: 2,  joined: daysAgo(8),   status: "active" },
  { id: "u-015", fullName: "Amy Taylor",        email: "amy@example.com",         phone: "+1 (555) 101-0010", role: "user",   orders: 0,  joined: daysAgo(3),   status: "active" },
  { id: "u-016", fullName: "Spam Account",      email: "spam@bot.com",            phone: "+1 (555) 999-9999", role: "user",   orders: 0,  joined: daysAgo(1),   status: "banned" },
];

// ── Restaurants ───────────────────────────────────────────────────────────────

export const adminRestaurants: AdminRestaurant[] = [
  { id: "burger-joint",      name: "The Burger Joint",    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop&q=80", category: "burgers",  ownerId: "u-003", ownerName: "Sam Torres",     orders: 342, revenue: 4108.18, rating: 4.8, reviewCount: 342, isOpen: true,  isActive: true,  address: "14 Main Street, Downtown",        joinedAt: daysAgo(95) },
  { id: "luigis-pizzeria",   name: "Luigi's Pizzeria",    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=280&fit=crop&q=80", category: "pizza",    ownerId: "u-002", ownerName: "Marco Russo",    orders: 521, revenue: 6290.21, rating: 4.9, reviewCount: 521, isOpen: true,  isActive: true,  address: "88 Napoli Ave, Little Italy",     joinedAt: daysAgo(120) },
  { id: "green-bowl",        name: "Green Bowl",          image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=280&fit=crop&q=80", category: "healthy",  ownerId: "u-004", ownerName: "Anika Sharma",   orders: 198, revenue: 2376.50, rating: 4.7, reviewCount: 198, isOpen: true,  isActive: true,  address: "22 Garden Street, Midtown",       joinedAt: daysAgo(88) },
  { id: "sakura-sushi",      name: "Sakura Sushi",        image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=280&fit=crop&q=80", category: "sushi",    ownerId: "u-005", ownerName: "Kenji Watanabe", orders: 287, revenue: 4880.60, rating: 4.6, reviewCount: 287, isOpen: false, isActive: true,  address: "55 Sakura Blvd, East Side",       joinedAt: daysAgo(60) },
  { id: "sweet-tooth",       name: "Sweet Tooth",         image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=280&fit=crop&q=80",    category: "desserts", ownerId: undefined, ownerName: undefined,       orders: 124, revenue: 1488.00, rating: 4.5, reviewCount: 124, isOpen: true,  isActive: true,  address: "9 Candy Lane, Uptown",            joinedAt: daysAgo(45) },
  { id: "himalayan-kitchen", name: "Himalayan Kitchen",   image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=280&fit=crop&q=80", category: "nepali",   ownerId: undefined, ownerName: undefined,       orders: 89,  revenue: 1068.00, rating: 4.4, reviewCount: 89,  isOpen: true,  isActive: true,  address: "33 Himalaya Road, West End",      joinedAt: daysAgo(40) },
  { id: "thirsty-drinks",    name: "Thirsty Drinks",      image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=280&fit=crop&q=80",    category: "drinks",   ownerId: undefined, ownerName: undefined,       orders: 73,  revenue: 584.00,  rating: 4.3, reviewCount: 73,  isOpen: true,  isActive: true,  address: "12 Sip Street, Downtown",         joinedAt: daysAgo(30) },
  { id: "taco-fiesta",       name: "Taco Fiesta",         image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=280&fit=crop&q=80", category: "tacos",    ownerId: undefined, ownerName: undefined,       orders: 156, revenue: 1872.00, rating: 4.6, reviewCount: 156, isOpen: true,  isActive: false, address: "77 Fiesta Ave, Southside",        joinedAt: daysAgo(25) },
];

// ── Orders (platform-wide) ────────────────────────────────────────────────────

export const adminOrders: AdminOrder[] = [
  { id: "ao-001", orderNumber: "AB3F", customerId: "u-006", customerName: "John Doe",      restaurantId: "burger-joint",    restaurantName: "The Burger Joint",  items: [{ name: "Classic Smash Burger", qty: 1 }, { name: "Seasoned Fries", qty: 1 }],    total: 26.71, status: "placed",           paymentMethod: "card", placedAt: minsAgo(3)      },
  { id: "ao-002", orderNumber: "CD7K", customerId: "u-007", customerName: "Sarah Miller",  restaurantId: "burger-joint",    restaurantName: "The Burger Joint",  items: [{ name: "Crispy Chicken Burger", qty: 1 }],                                          total: 15.73, status: "placed",           paymentMethod: "cash", placedAt: minsAgo(6)      },
  { id: "ao-003", orderNumber: "EF9P", customerId: "u-008", customerName: "Mike Chen",     restaurantId: "luigis-pizzeria", restaurantName: "Luigi's Pizzeria",  items: [{ name: "Margherita Pizza", qty: 1 }, { name: "Tiramisu", qty: 2 }],                 total: 32.47, status: "preparing",        paymentMethod: "card", placedAt: minsAgo(22)     },
  { id: "ao-004", orderNumber: "GH2R", customerId: "u-009", customerName: "Lisa Wong",     restaurantId: "green-bowl",      restaurantName: "Green Bowl",        items: [{ name: "Kale Caesar Salad", qty: 1 }],                                              total: 21.47, status: "preparing",        paymentMethod: "card", placedAt: minsAgo(31)     },
  { id: "ao-005", orderNumber: "KL5T", customerId: "u-010", customerName: "Raj Patel",     restaurantId: "sakura-sushi",    restaurantName: "Sakura Sushi",      items: [{ name: "Dragon Roll", qty: 2 }, { name: "Miso Soup", qty: 1 }],                     total: 41.99, status: "out_for_delivery", paymentMethod: "card", placedAt: minsAgo(52)     },
  { id: "ao-006", orderNumber: "MN8V", customerId: "u-011", customerName: "Emma Davis",    restaurantId: "taco-fiesta",     restaurantName: "Taco Fiesta",       items: [{ name: "Beef Tacos x3", qty: 1 }, { name: "Nachos", qty: 1 }],                      total: 25.47, status: "out_for_delivery", paymentMethod: "cash", placedAt: minsAgo(45)     },
  { id: "ao-007", orderNumber: "PQ1X", customerId: "u-012", customerName: "James Wilson",  restaurantId: "burger-joint",    restaurantName: "The Burger Joint",  items: [{ name: "BBQ Bacon Stack", qty: 2 }],                                                total: 34.95, status: "delivered",        paymentMethod: "card", placedAt: daysAgo(0, 11)  },
  { id: "ao-008", orderNumber: "RS4Y", customerId: "u-013", customerName: "Nina Garcia",   restaurantId: "luigis-pizzeria", restaurantName: "Luigi's Pizzeria",  items: [{ name: "Pepperoni Pizza", qty: 1 }, { name: "Garlic Bread", qty: 1 }],              total: 24.48, status: "delivered",        paymentMethod: "card", placedAt: daysAgo(0, 10)  },
  { id: "ao-009", orderNumber: "TU7Z", customerId: "u-014", customerName: "Carlos Brown",  restaurantId: "sweet-tooth",     restaurantName: "Sweet Tooth",       items: [{ name: "Chocolate Cake", qty: 1 }],                                                 total: 16.78, status: "delivered",        paymentMethod: "cash", placedAt: daysAgo(1, 13)  },
  { id: "ao-010", orderNumber: "VW0A", customerId: "u-006", customerName: "John Doe",      restaurantId: "green-bowl",      restaurantName: "Green Bowl",        items: [{ name: "Protein Bowl", qty: 1 }, { name: "Fresh Juice", qty: 1 }],                  total: 27.46, status: "delivered",        paymentMethod: "card", placedAt: daysAgo(1, 18)  },
  { id: "ao-011", orderNumber: "XY3B", customerId: "u-008", customerName: "Mike Chen",     restaurantId: "sakura-sushi",    restaurantName: "Sakura Sushi",      items: [{ name: "Salmon Sashimi", qty: 1 }, { name: "Tempura", qty: 1 }],                    total: 38.50, status: "delivered",        paymentMethod: "card", placedAt: daysAgo(2, 12)  },
  { id: "ao-012", orderNumber: "ZA6C", customerId: "u-010", customerName: "Raj Patel",     restaurantId: "himalayan-kitchen", restaurantName: "Himalayan Kitchen",items: [{ name: "Dal Bhat", qty: 2 }],                                                       total: 22.98, status: "delivered",        paymentMethod: "cash", placedAt: daysAgo(2, 19)  },
  { id: "ao-013", orderNumber: "BC9D", customerId: "u-007", customerName: "Sarah Miller",  restaurantId: "burger-joint",    restaurantName: "The Burger Joint",  items: [{ name: "Classic Smash Burger", qty: 3 }],                                           total: 41.96, status: "cancelled",        paymentMethod: "card", placedAt: daysAgo(3, 14)  },
  { id: "ao-014", orderNumber: "DE2E", customerId: "u-012", customerName: "James Wilson",  restaurantId: "luigis-pizzeria", restaurantName: "Luigi's Pizzeria",  items: [{ name: "Four Cheese Pizza", qty: 1 }, { name: "Pasta Carbonara", qty: 1 }],        total: 36.98, status: "delivered",        paymentMethod: "card", placedAt: daysAgo(3, 20)  },
  { id: "ao-015", orderNumber: "FG5F", customerId: "u-011", customerName: "Emma Davis",    restaurantId: "thirsty-drinks",  restaurantName: "Thirsty Drinks",    items: [{ name: "Mango Smoothie", qty: 2 }, { name: "Protein Shake", qty: 1 }],             total: 18.97, status: "delivered",        paymentMethod: "cash", placedAt: daysAgo(4, 16)  },
];

// ── Transactions ──────────────────────────────────────────────────────────────

export const transactions: Transaction[] = adminOrders
  .filter((o) => o.status === "delivered" || o.status === "cancelled")
  .map((o, i) => ({
    id:             `txn-${String(i + 1).padStart(4, "0")}`,
    orderId:        o.id,
    orderNumber:    o.orderNumber,
    customerName:   o.customerName,
    restaurantName: o.restaurantName,
    amount:         o.total,
    method:         o.paymentMethod,
    status:         (o.status === "delivered" ? "paid" : "failed") as "paid" | "refunded" | "failed",
    date:           o.placedAt,
  }));

// ── Coupons ───────────────────────────────────────────────────────────────────

export const coupons: Coupon[] = [
  {
    id: "cp-001", code: "FIRST10",  type: "percent", value: 10, minOrder: 15,  maxUses: 0,    usedCount: 284,
    expiresAt: daysAgo(-60),  isActive: true,
    description: "10% off first order",
  },
  {
    id: "cp-002", code: "SAVE5",    type: "flat",    value: 5,  minOrder: 20,  maxUses: 0,    usedCount: 512,
    expiresAt: daysAgo(-30),  isActive: true,
    description: "$5 off orders above $20",
  },
  {
    id: "cp-003", code: "WELCOME15",type: "percent", value: 15, minOrder: 25,  maxUses: 500,  usedCount: 127,
    expiresAt: daysAgo(-14),  isActive: true,
    description: "15% off for new signups",
  },
  {
    id: "cp-004", code: "PIZZA20",  type: "percent", value: 20, minOrder: 30,  maxUses: 100,  usedCount: 100,
    expiresAt: daysAgo(2),    isActive: false,
    description: "20% off at Luigi's (expired)",
  },
  {
    id: "cp-005", code: "FRIDAY10", type: "flat",    value: 10, minOrder: 40,  maxUses: 200,  usedCount: 43,
    expiresAt: daysAgo(-7),   isActive: true,
    description: "$10 off Friday orders",
  },
  {
    id: "cp-006", code: "SUMMER25", type: "percent", value: 25, minOrder: 50,  maxUses: 300,  usedCount: 0,
    expiresAt: daysAgo(-90),  isActive: false,
    description: "Summer promo — not yet active",
  },
];

// ── Platform categories ───────────────────────────────────────────────────────

export const platformCategories: PlatformCategory[] = [
  { id: "pc-1", name: "Burgers",  emoji: "🍔", slug: "burgers",  restaurantCount: 1, isActive: true  },
  { id: "pc-2", name: "Pizza",    emoji: "🍕", slug: "pizza",    restaurantCount: 1, isActive: true  },
  { id: "pc-3", name: "Healthy",  emoji: "🥗", slug: "healthy",  restaurantCount: 1, isActive: true  },
  { id: "pc-4", name: "Sushi",    emoji: "🍣", slug: "sushi",    restaurantCount: 1, isActive: true  },
  { id: "pc-5", name: "Desserts", emoji: "🍰", slug: "desserts", restaurantCount: 1, isActive: true  },
  { id: "pc-6", name: "Nepali",   emoji: "🍛", slug: "nepali",   restaurantCount: 1, isActive: true  },
  { id: "pc-7", name: "Drinks",   emoji: "🥤", slug: "drinks",   restaurantCount: 1, isActive: true  },
  { id: "pc-8", name: "Tacos",    emoji: "🌮", slug: "tacos",    restaurantCount: 1, isActive: false },
];

// ── Platform analytics ────────────────────────────────────────────────────────

export interface DailyMetric { date: string; revenue: number; orders: number; users: number }

export const analyticsMonthly: DailyMetric[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const base = 400 + Math.sin(i * 0.5) * 200 + (i > 20 ? i * 15 : 0);
  return {
    date:    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Math.round(base * 100) / 100,
    orders:  Math.round(base / 14),
    users:   Math.round(Math.random() * 4 + 1),
  };
});

export const platformStats = {
  totalUsers:       adminUsers.filter((u) => u.role === "user").length,
  totalOwners:      adminUsers.filter((u) => u.role === "owner").length,
  totalRestaurants: adminRestaurants.length,
  activeRestaurants: adminRestaurants.filter((r) => r.isActive).length,
  totalOrders:      3891,
  todayOrders:      adminOrders.filter((o) => {
    const d = new Date(o.placedAt); const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  }).length,
  totalRevenue:     48230.50,
  todayRevenue:     adminOrders
    .filter((o) => o.status === "delivered" && (() => { const d = new Date(o.placedAt); const n = new Date(); return d.getDate() === n.getDate() && d.getMonth() === n.getMonth(); })())
    .reduce((s, o) => s + o.total, 0),
  activeOrders:     adminOrders.filter((o) => o.status === "placed" || o.status === "preparing" || o.status === "out_for_delivery").length,
};

// ── Settings ──────────────────────────────────────────────────────────────────

export const defaultSettings: PlatformSettings = {
  platformName:       "CraveExpress",
  supportEmail:       "support@craveexpress.com",
  supportPhone:       "+1 (800) 555-CRAVE",
  defaultDeliveryFee: 2.99,
  defaultMinOrder:    10,
  commissionRate:     15,
  maintenanceMode:    false,
  allowGuestCheckout: true,
  maxDeliveryRadius:  10,
};
