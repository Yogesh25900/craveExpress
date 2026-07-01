/**
 * Seed script — populates MongoDB with Phase 1+2 data.
 * Run: npm run seed
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../src/config/env";
import { User } from "../src/models/User";
import { Restaurant } from "../src/models/Restaurant";
import { MenuItem } from "../src/models/MenuItem";
import { MenuCategory } from "../src/models/MenuCategory";
import { PlatformCategory } from "../src/models/PlatformCategory";
import { Review } from "../src/models/Review";
import { Coupon } from "../src/models/Coupon";
import { PlatformSettings } from "../src/models/PlatformSettings";

const U = "https://images.unsplash.com";

// ─── Restaurant data ──────────────────────────────────────────────────────────

const RESTAURANTS = [
  {
    slug: "burger-joint",
    name: "The Burger Joint",
    image: `${U}/photo-1568901346375-23c9450c58cd?w=600&h=380&fit=crop&q=80`,
    banner: `${U}/photo-1568901346375-23c9450c58cd?w=1200&h=420&fit=crop&q=80`,
    cuisineTypes: ["American", "Burgers", "Fast Food"],
    category: "burgers", rating: 4.8, reviewCount: 342,
    deliveryTime: "20-30 min", deliveryFee: 1.99, minOrder: 10,
    isOpen: true, address: "14 Main Street, Downtown",
    location: { type: "Point", coordinates: [-73.9855, 40.7580] },
    deliveryRadius: 4,
    tags: ["Top Rated", "Popular"],
  },
  {
    slug: "luigis-pizzeria",
    name: "Luigi's Pizzeria",
    image: `${U}/photo-1565299624946-b28f40a0ae38?w=600&h=380&fit=crop&q=80`,
    banner: `${U}/photo-1565299624946-b28f40a0ae38?w=1200&h=420&fit=crop&q=80`,
    cuisineTypes: ["Italian", "Pizza", "Comfort Food"],
    category: "pizza", rating: 4.9, reviewCount: 521,
    deliveryTime: "35-45 min", deliveryFee: 0, minOrder: 15,
    isOpen: true, address: "88 Napoli Ave, Little Italy",
    location: { type: "Point", coordinates: [-73.9962, 40.7195] },
    deliveryRadius: 6,
    tags: ["Top Rated", "Free Delivery"],
  },
  {
    slug: "green-bowl",
    name: "Green Bowl",
    image: `${U}/photo-1512621776951-a57141f2eefd?w=600&h=380&fit=crop&q=80`,
    banner: `${U}/photo-1490645935967-10de6ba17061?w=1200&h=420&fit=crop&q=80`,
    cuisineTypes: ["Healthy", "Salads", "Vegan"],
    category: "healthy", rating: 4.7, reviewCount: 214,
    deliveryTime: "15-25 min", deliveryFee: 2.49, minOrder: 12,
    isOpen: true, address: "7 Wellness Way, Midtown",
    location: { type: "Point", coordinates: [-73.9840, 40.7549] },
    deliveryRadius: 3,
    tags: ["Popular", "Vegan Friendly"],
  },
  {
    slug: "sakura-sushi",
    name: "Sakura Sushi",
    image: `${U}/photo-1579871494447-9811cf80d66c?w=600&h=380&fit=crop&q=80`,
    banner: `${U}/photo-1579871494447-9811cf80d66c?w=1200&h=420&fit=crop&q=80`,
    cuisineTypes: ["Japanese", "Sushi", "Asian"],
    category: "sushi", rating: 4.6, reviewCount: 178,
    deliveryTime: "40-50 min", deliveryFee: 3.99, minOrder: 20,
    isOpen: true, address: "22 Sakura Blvd, East Side",
    location: { type: "Point", coordinates: [-73.9773, 40.7505] },
    deliveryRadius: 5,
    tags: ["Premium"],
  },
  {
    slug: "sweet-tooth",
    name: "Sweet Tooth Desserts",
    image: `${U}/photo-1551024601-bec78aea704b?w=600&h=380&fit=crop&q=80`,
    banner: `${U}/photo-1551024601-bec78aea704b?w=1200&h=420&fit=crop&q=80`,
    cuisineTypes: ["Desserts", "Cakes", "Ice Cream"],
    category: "desserts", rating: 4.5, reviewCount: 193,
    deliveryTime: "25-35 min", deliveryFee: 1.49, minOrder: 8,
    isOpen: true, address: "5 Sugar Lane, Westville",
    location: { type: "Point", coordinates: [-74.0048, 40.7488] },
    deliveryRadius: 4,
    tags: ["Popular"],
  },
  {
    slug: "himalayan-kitchen",
    name: "Himalayan Kitchen",
    image: `${U}/photo-1585937421612-70a008356fbe?w=600&h=380&fit=crop&q=80`,
    banner: `${U}/photo-1585937421612-70a008356fbe?w=1200&h=420&fit=crop&q=80`,
    cuisineTypes: ["Nepali", "Indian", "Asian"],
    category: "nepali", rating: 4.7, reviewCount: 156,
    deliveryTime: "30-40 min", deliveryFee: 0, minOrder: 12,
    isOpen: true, address: "31 Himalaya Road, Northgate",
    location: { type: "Point", coordinates: [-73.9808, 40.7648] },
    deliveryRadius: 7,
    tags: ["Free Delivery", "Authentic"],
  },
  {
    slug: "thirsty-drinks",
    name: "Thirsty Drinks Bar",
    image: `${U}/photo-1544145945-f90425340c7e?w=600&h=380&fit=crop&q=80`,
    banner: `${U}/photo-1544145945-f90425340c7e?w=1200&h=420&fit=crop&q=80`,
    cuisineTypes: ["Beverages", "Smoothies", "Shakes"],
    category: "drinks", rating: 4.4, reviewCount: 98,
    deliveryTime: "15-20 min", deliveryFee: 0.99, minOrder: 6,
    isOpen: true, address: "12 Refresh Street, Uptown",
    location: { type: "Point", coordinates: [-73.9843, 40.7694] },
    deliveryRadius: 3,
    tags: ["Fast Delivery"],
  },
  {
    slug: "taco-fiesta",
    name: "Taco Fiesta",
    image: `${U}/photo-1565299585323-38d6b0865b47?w=600&h=380&fit=crop&q=80`,
    banner: `${U}/photo-1565299585323-38d6b0865b47?w=1200&h=420&fit=crop&q=80`,
    cuisineTypes: ["Mexican", "Tacos", "Burritos"],
    category: "burgers", rating: 4.3, reviewCount: 127,
    deliveryTime: "25-35 min", deliveryFee: 1.99, minOrder: 10,
    isOpen: false, address: "67 Fiesta Ave, Southpark",
    location: { type: "Point", coordinates: [-73.9916, 40.7420] },
    deliveryRadius: 5,
    tags: [],
  },
];

// ─── Menu items ───────────────────────────────────────────────────────────────

function items(restaurantSlug: string, rid: mongoose.Types.ObjectId) {
  type ItemDef = { category: string; name: string; description: string; price: number; image: string; isPopular: boolean; isVeg: boolean; addons: { name: string; price: number }[] };
  const m: Record<string, ItemDef[]> = {
    "burger-joint": [
      { category: "starters",  name: "Crispy Onion Rings",    description: "Golden-fried onion rings with house dipping sauce.",           price: 5.99,  image: `${U}/photo-1621447504864-d8686e12698c?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [{ name: "Extra Sauce", price: 0.50 }] },
      { category: "starters",  name: "Loaded Nachos",          description: "Tortilla chips with cheese, jalapeños, sour cream and salsa.",  price: 7.49,  image: `${U}/photo-1565299585323-38d6b0865b47?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [{ name: "Add Guacamole", price: 1.50 }, { name: "Add Chicken", price: 2.00 }] },
      { category: "burgers",   name: "Classic Smash Burger",   description: "Double smash patty, American cheese, pickles, mustard & ketchup.", price: 11.99, image: `${U}/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: false, addons: [{ name: "Extra Patty", price: 3.00 }, { name: "Extra Cheese", price: 0.75 }, { name: "Bacon", price: 1.50 }, { name: "Jalapeños", price: 0.30 }] },
      { category: "burgers",   name: "BBQ Bacon Stack",        description: "Beef patty, bacon, cheddar, BBQ sauce, onion rings on brioche.", price: 14.49, image: `${U}/photo-1553979459-d2229ba7433a?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: false, addons: [{ name: "Extra Patty", price: 3.00 }, { name: "Extra Cheese", price: 0.75 }] },
      { category: "burgers",   name: "Crispy Chicken Burger",  description: "Buttermilk-fried chicken thigh, coleslaw, pickles, chipotle mayo.", price: 12.99, image: `${U}/photo-1572802419224-296b0aeee0d9?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: false, addons: [{ name: "Extra Cheese", price: 0.75 }, { name: "Avocado", price: 1.50 }] },
      { category: "sides",     name: "Seasoned Fries",         description: "Skin-on fries tossed in our secret spice blend.",              price: 4.49,  image: `${U}/photo-1573080496219-bb080dd4f877?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [{ name: "Cheese Sauce", price: 0.75 }] },
      { category: "drinks",    name: "Classic Milkshake",      description: "Vanilla, Chocolate, or Strawberry. Thick and creamy.",         price: 5.99,  image: `${U}/photo-1544145945-f90425340c7e?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [] },
    ],
    "luigis-pizzeria": [
      { category: "antipasti", name: "Garlic Bread",           description: "Toasted ciabatta with roasted garlic butter and fresh herbs.",  price: 5.49,  image: `${U}/photo-1573140247632-f8fd74997d5c?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [{ name: "Add Cheese", price: 1.00 }] },
      { category: "antipasti", name: "Bruschetta",             description: "Toasted bread with fresh tomato, basil, olive oil and sea salt.", price: 6.99, image: `${U}/photo-1572449043416-55f4685c9bb7?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [] },
      { category: "pizzas",    name: "Margherita",             description: "San Marzano tomato, fior di latte mozzarella, fresh basil.",    price: 13.99, image: `${U}/photo-1565299624946-b28f40a0ae38?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [{ name: "Extra Cheese", price: 1.50 }, { name: "Mushrooms", price: 1.00 }] },
      { category: "pizzas",    name: "Pepperoni Feast",        description: "Double layer of pepperoni, mozzarella, tomato sauce.",          price: 16.49, image: `${U}/photo-1628840042765-356cda07504e?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: false, addons: [{ name: "Extra Cheese", price: 1.50 }, { name: "Extra Pepperoni", price: 2.00 }] },
      { category: "pizzas",    name: "BBQ Chicken",            description: "BBQ sauce, grilled chicken, red onion, capsicum, mozzarella.", price: 17.49, image: `${U}/photo-1513104890138-7c749659a591?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: false, addons: [{ name: "Extra Cheese", price: 1.50 }] },
      { category: "pasta",     name: "Spaghetti Carbonara",    description: "Spaghetti with pancetta, egg yolk, pecorino, black pepper.",   price: 14.99, image: `${U}/photo-1612874742237-6526221588e3?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: false, addons: [{ name: "Extra Pancetta", price: 2.00 }] },
      { category: "desserts",  name: "Tiramisu",               description: "Classic Italian tiramisu with mascarpone, espresso and cocoa.", price: 7.99,  image: `${U}/photo-1551024601-bec78aea704b?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [] },
    ],
    "green-bowl": [
      { category: "salads",    name: "Caesar Salad",           description: "Romaine, parmesan, croutons, Caesar dressing.",                price: 10.99, image: `${U}/photo-1512621776951-a57141f2eefd?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [{ name: "Grilled Chicken", price: 3.00 }, { name: "Smoked Salmon", price: 4.50 }] },
      { category: "bowls",     name: "Avocado Power Bowl",     description: "Brown rice, avocado, edamame, roasted veggies, tahini.",       price: 13.49, image: `${U}/photo-1490645935967-10de6ba17061?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [{ name: "Grilled Chicken", price: 3.00 }] },
      { category: "wraps",     name: "Grilled Chicken Wrap",   description: "Whole-wheat wrap with chicken, greens, tomato, hummus.",       price: 11.49, image: `${U}/photo-1540420773420-3366772f4999?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: false, addons: [] },
      { category: "drinks",    name: "Green Detox Smoothie",   description: "Spinach, cucumber, apple, ginger, lemon.",                    price: 7.99,  image: `${U}/photo-1544145945-f90425340c7e?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [] },
    ],
    "himalayan-kitchen": [
      { category: "starters",  name: "Veg Momos (8 pcs)",      description: "Steamed dumplings with spiced vegetables and tomato achar.",  price: 8.99,  image: `${U}/photo-1585937421612-70a008356fbe?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [{ name: "Extra Achar", price: 0.50 }, { name: "Fried (upgrade)", price: 1.00 }] },
      { category: "starters",  name: "Chicken Momos (8 pcs)",  description: "Steamed dumplings with minced chicken and spices.",          price: 10.99, image: `${U}/photo-1585937421612-70a008356fbe?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: false, addons: [{ name: "Extra Achar", price: 0.50 }, { name: "Fried (upgrade)", price: 1.00 }] },
      { category: "mains",     name: "Dal Bhat Thali",          description: "Nepali set meal: lentil soup, rice, 2 curries, pickle.",    price: 15.99, image: `${U}/photo-1585937421612-70a008356fbe?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [{ name: "Add Chicken Curry", price: 3.50 }] },
      { category: "mains",     name: "Butter Chicken",          description: "Tender chicken in a rich, creamy tomato-based sauce.",       price: 14.99, image: `${U}/photo-1585937421612-70a008356fbe?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: false, addons: [{ name: "Extra Naan", price: 2.00 }] },
    ],
    "sakura-sushi": [
      { category: "starters",  name: "Edamame",                 description: "Steamed salted edamame beans.",                              price: 4.99,  image: `${U}/photo-1579871494447-9811cf80d66c?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [] },
      { category: "rolls",     name: "California Roll (8 pcs)", description: "Crab stick, avocado, cucumber, sesame seeds.",              price: 11.99, image: `${U}/photo-1579871494447-9811cf80d66c?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: false, addons: [{ name: "Extra Wasabi", price: 0.50 }] },
      { category: "rolls",     name: "Spicy Tuna Roll (8 pcs)", description: "Fresh tuna, spicy mayo, cucumber, sesame.",                 price: 13.99, image: `${U}/photo-1579871494447-9811cf80d66c?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: false, addons: [] },
      { category: "nigiri",    name: "Salmon Nigiri (2 pcs)",   description: "Fresh Atlantic salmon over pressed rice.",                  price: 8.99,  image: `${U}/photo-1579871494447-9811cf80d66c?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: false, addons: [] },
    ],
    "sweet-tooth": [
      { category: "cakes",     name: "Red Velvet Slice",        description: "Moist red velvet cake with cream cheese frosting.",         price: 7.49,  image: `${U}/photo-1551024601-bec78aea704b?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [] },
      { category: "ice-cream", name: "Sundae Bowl",             description: "3 scoops of your choice with toppings.",                   price: 8.99,  image: `${U}/photo-1551024601-bec78aea704b?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [{ name: "Extra Scoop", price: 2.00 }, { name: "Hot Fudge", price: 1.00 }] },
      { category: "waffles",   name: "Belgian Waffle",          description: "Crispy waffle with maple syrup and fresh berries.",        price: 9.99,  image: `${U}/photo-1551024601-bec78aea704b?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [{ name: "Add Ice Cream", price: 2.50 }] },
    ],
    "thirsty-drinks": [
      { category: "smoothies", name: "Berry Blast Smoothie",    description: "Strawberry, blueberry, raspberry, banana, oat milk.",      price: 8.49,  image: `${U}/photo-1544145945-f90425340c7e?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [{ name: "Protein Powder", price: 1.50 }] },
      { category: "shakes",    name: "Oreo Shake",              description: "Thick vanilla milkshake blended with Oreo cookies.",       price: 7.99,  image: `${U}/photo-1544145945-f90425340c7e?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: true,  addons: [] },
      { category: "juices",    name: "Orange Juice",            description: "Freshly squeezed orange juice.",                           price: 5.49,  image: `${U}/photo-1544145945-f90425340c7e?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [] },
      { category: "hot",       name: "Flat White",              description: "Double shot espresso with velvety steamed milk.",          price: 4.99,  image: `${U}/photo-1544145945-f90425340c7e?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [{ name: "Extra Shot", price: 0.75 }] },
    ],
    "taco-fiesta": [
      { category: "tacos",     name: "Carne Asada Taco",        description: "Grilled beef, salsa, onion, cilantro, corn tortilla.",     price: 4.49,  image: `${U}/photo-1565299585323-38d6b0865b47?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: false, addons: [{ name: "Add Guac", price: 1.00 }] },
      { category: "burritos",  name: "Chicken Burrito",         description: "Grilled chicken, rice, black beans, cheese, sour cream.",  price: 11.99, image: `${U}/photo-1565299585323-38d6b0865b47?w=400&h=280&fit=crop&q=80`, isPopular: true,  isVeg: false, addons: [{ name: "Extra Cheese", price: 0.75 }] },
      { category: "nachos",    name: "Loaded Nachos Grande",    description: "Nachos with cheese, beans, jalapeños, guac, sour cream.",  price: 10.49, image: `${U}/photo-1565299585323-38d6b0865b47?w=400&h=280&fit=crop&q=80`, isPopular: false, isVeg: true,  addons: [{ name: "Add Chicken", price: 2.50 }] },
    ],
  };

  return (m[restaurantSlug] ?? []).map((item) => ({
    ...item,
    restaurantId: rid,
    restaurantSlug,
  }));
}

// ─── Seed reviews ─────────────────────────────────────────────────────────────

function reviews(restaurantSlug: string, rid: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
  const bank = [
    { userName: "Alex M.",   rating: 5, comment: "Absolutely delicious! Will order again.",              avatarColor: "bg-blue-500"   },
    { userName: "Sarah K.",  rating: 4, comment: "Great food, delivery was a bit slow but worth it.",    avatarColor: "bg-pink-500"   },
    { userName: "James T.",  rating: 5, comment: "Best in the city. Highly recommend the specials.",     avatarColor: "bg-green-500"  },
    { userName: "Priya R.",  rating: 4, comment: "Loved it! Very fresh ingredients.",                    avatarColor: "bg-purple-500" },
    { userName: "Tom W.",    rating: 3, comment: "Good but portion sizes could be larger.",              avatarColor: "bg-yellow-500" },
  ];
  return bank.slice(0, 3).map((r) => ({ ...r, restaurantId: rid, restaurantSlug, userId }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB:", env.MONGODB_URI);

  // Wipe existing data
  await Promise.all([
    User.deleteMany({}),
    Restaurant.deleteMany({}),
    MenuItem.deleteMany({}),
    MenuCategory.deleteMany({}),
    PlatformCategory.deleteMany({}),
    Review.deleteMany({}),
    Coupon.deleteMany({}),
    PlatformSettings.deleteMany({}),
  ]);
  console.log("Cleared existing data");

  // ── Create users ────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await User.create({
    fullName: "Admin User",
    email: "admin@craveexpress.com",
    password: adminPassword,
    phone: "9800000001",
    role: "admin",
  });
  console.log(`Created admin: ${admin.email} / admin123`);

  const demoPassword = await bcrypt.hash("demo1234", 12);
  const demoUser = await User.create({
    fullName: "Demo User",
    email: "demo@craveexpress.com",
    password: demoPassword,
    phone: "9800000000",
    role: "user",
    addresses: [
      { label: "Home", street: "123 Maple Street",               city: "New York, NY", zip: "10001" },
      { label: "Work", street: "456 Business Ave, Suite 200",    city: "New York, NY", zip: "10005" },
    ],
  });
  console.log(`Created demo user: ${demoUser.email} / demo1234`);

  // ── Platform categories ──────────────────────────────────────────────────
  await PlatformCategory.insertMany([
    { slug: "pizza",    name: "Pizza",    emoji: "🍕", sortOrder: 1, isActive: true },
    { slug: "burgers",  name: "Burgers",  emoji: "🍔", sortOrder: 2, isActive: true },
    { slug: "healthy",  name: "Healthy",  emoji: "🥗", sortOrder: 3, isActive: true },
    { slug: "sushi",    name: "Sushi",    emoji: "🍣", sortOrder: 4, isActive: true },
    { slug: "desserts", name: "Desserts", emoji: "🍰", sortOrder: 5, isActive: true },
    { slug: "nepali",   name: "Nepali",   emoji: "🍛", sortOrder: 6, isActive: true },
    { slug: "drinks",   name: "Drinks",   emoji: "🥤", sortOrder: 7, isActive: true },
  ]);
  console.log("Seeded 7 platform categories");

  // ── Seed restaurants + menu items + menu categories + reviews ────────────
  const restaurantMap: Record<string, mongoose.Types.ObjectId> = {};

  // Menu categories per restaurant (matches item category strings in items())
  const MENU_CATS: Record<string, string[]> = {
    "burger-joint":    ["starters", "burgers", "sides", "drinks"],
    "luigis-pizzeria": ["antipasti", "pizzas", "pasta", "desserts", "drinks"],
    "green-bowl":      ["salads", "bowls", "wraps", "drinks"],
    "sakura-sushi":    ["starters", "rolls", "nigiri"],
    "sweet-tooth":     ["cakes", "ice-cream", "waffles"],
    "himalayan-kitchen": ["starters", "mains"],
    "thirsty-drinks":  ["smoothies", "shakes", "juices", "hot"],
    "taco-fiesta":     ["tacos", "burritos", "nachos"],
  };

  for (const rData of RESTAURANTS) {
    const restaurant = await Restaurant.create(rData);
    const rid = restaurant._id as mongoose.Types.ObjectId;
    restaurantMap[rData.slug] = rid;

    const menuDocs   = items(rData.slug, rid);
    const reviewDocs = reviews(rData.slug, rid, demoUser._id as mongoose.Types.ObjectId);
    await MenuItem.insertMany(menuDocs);
    await Review.insertMany(reviewDocs);

    // Seed menu categories for this restaurant
    const catNames = MENU_CATS[rData.slug] ?? [];
    await MenuCategory.insertMany(
      catNames.map((name, i) => ({ restaurantId: rid, restaurantSlug: rData.slug, name, sortOrder: i }))
    );

    console.log(`Seeded: ${rData.name} (${menuDocs.length} items, ${catNames.length} menu categories, ${reviewDocs.length} reviews)`);
  }

  // ── Owner users (linked to their restaurants) ────────────────────────────
  const ownerPw = await bcrypt.hash("owner123", 12);
  const owners = [
    { fullName: "Sam Torres",     email: "sam@burgerjoint.com",  phone: "9800000010", restaurantSlug: "burger-joint"     },
    { fullName: "Marco Russo",    email: "marco@luigis.com",     phone: "9800000011", restaurantSlug: "luigis-pizzeria"  },
    { fullName: "Anika Sharma",   email: "anika@greenbowl.com",  phone: "9800000012", restaurantSlug: "green-bowl"       },
    { fullName: "Kenji Watanabe", email: "kenji@sakura.com",     phone: "9800000013", restaurantSlug: "sakura-sushi"     },
  ];

  for (const ownerData of owners) {
    const restaurantId = restaurantMap[ownerData.restaurantSlug];
    await User.create({
      fullName:       ownerData.fullName,
      email:          ownerData.email,
      password:       ownerPw,
      phone:          ownerData.phone,
      role:           "owner",
      restaurantId,
      restaurantSlug: ownerData.restaurantSlug,
    });
    console.log(`Created owner: ${ownerData.email} / owner123 → ${ownerData.restaurantSlug}`);
  }

  // ── Coupons ──────────────────────────────────────────────────────────────
  const future = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const past   = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  await Coupon.insertMany([
    { code: "WELCOME15", type: "percent", value: 15, minOrder: 0,  maxUses: 0,   usedCount: 0,   expiresAt: future(365), isActive: true,  description: "Welcome discount for new users" },
    { code: "FIRST10",   type: "percent", value: 10, minOrder: 10, maxUses: 100, usedCount: 23,  expiresAt: future(30),  isActive: true,  description: "First order discount" },
    { code: "SAVE5",     type: "flat",    value: 5,  minOrder: 20, maxUses: 50,  usedCount: 12,  expiresAt: future(14),  isActive: true,  description: "Flat $5 off on orders over $20" },
    { code: "PIZZA20",   type: "percent", value: 20, minOrder: 25, maxUses: 200, usedCount: 87,  expiresAt: future(60),  isActive: true,  description: "20% off pizza orders" },
    { code: "SUMMER25",  type: "percent", value: 25, minOrder: 30, maxUses: 500, usedCount: 142, expiresAt: future(90),  isActive: true,  description: "Summer special — 25% off" },
    { code: "FRIDAY10",  type: "flat",    value: 10, minOrder: 35, maxUses: 0,   usedCount: 0,   expiresAt: past(5),     isActive: false, description: "Friday special (expired)" },
  ]);
  console.log("Seeded 6 coupons");

  // ── Platform settings ─────────────────────────────────────────────────────
  await PlatformSettings.create({ key: "global" });
  console.log("Seeded platform settings");

  console.log("\n✅  Seed complete");
  console.log("   Admin:   admin@craveexpress.com / admin123");
  console.log("   Demo:    demo@craveexpress.com  / demo1234");
  console.log("   Owners:  sam@burgerjoint.com | marco@luigis.com | anika@greenbowl.com | kenji@sakura.com / owner123");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
