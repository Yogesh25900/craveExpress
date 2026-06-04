@AGENTS.md

# CraveExpress — Frontend Context & Build Plan

## What this project is
A full-featured food delivery web app (think Uber Eats / DoorDash) called **CraveExpress**.  
Brand colour: **#ff6b35** (orange). Secondary accent: **#e55a26** (dark orange).  
Stack: **Next.js 16.2.9 · App Router · Tailwind CSS v4 · TypeScript · lucide-react**

---

## Design System (follow exactly — no deviations)

### Colours
| Token | Value | Use |
|---|---|---|
| Primary | `#ff6b35` | CTAs, active states, brand accents |
| Primary hover | `#e55a26` | Button hover, focus rings |
| Primary light | `#fff3ef` | Tags, badge backgrounds |
| Page bg | `#f9fafb` (gray-50) | Section alternating bg |
| Card bg | `#ffffff` | All cards |
| Border | `border-gray-100` | Card borders |
| Text primary | `text-gray-900` | Headings |
| Text secondary | `text-gray-500` | Meta, captions |
| Star/rating | `fill-amber-400 text-amber-400` | |
| Success | `text-green-600` | Free delivery, success states |
| Error | `text-red-500` | Validation, errors |

### Typography
- Font: **Geist Sans** (already loaded in layout.tsx via `next/font/google`)
- Page section headings: `text-2xl font-bold text-gray-900`
- Card titles: `font-semibold text-gray-900 text-[15px]`
- Meta / captions: `text-xs text-gray-500`
- Body: `text-sm text-gray-600`

### Component Patterns
- **Cards**: `bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all`
- **Primary button**: `bg-[#ff6b35] hover:bg-[#e55a26] text-white font-semibold rounded-full transition-colors`
- **Ghost button**: `border border-gray-200 bg-white text-gray-700 hover:border-[#ff6b35] hover:text-[#ff6b35] rounded-full transition-colors`
- **Input**: `bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35]`
- **Pill tag**: `bg-[#fff3ef] text-[#ff6b35] text-xs font-semibold px-3 py-1 rounded-full`
- **Navbar height**: `h-16`, sticky, white, `border-b border-gray-100 shadow-sm`
- **Max container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Section padding**: `py-14` (standard), `py-20` (hero/feature sections)

### Image handling
- Remote images from `images.unsplash.com` are allowed (configured in next.config.ts)
- Always use `next/image` (`Image` from `"next/image"`) — never raw `<img>` tags
- For restaurant/food cards: `fill` + `object-cover` inside a `relative` container with fixed height
- For hero banners: `fill` + `object-cover` + `priority`

---

## Route Map & Screen Inventory

### Public routes
| Route | Screen | Status |
|---|---|---|
| `/` | Landing page | ✅ Done |
| `/login` | Login | ✅ Done |
| `/signup` | Sign Up | ✅ Done |
| `/forgot-password` | Forgot Password | ✅ Done |

### App routes (accessible with or without auth)
| Route | Screen | Status |
|---|---|---|
| `/restaurants` | Restaurant listing + filters | ✅ Done |
| `/restaurants/[id]` | Restaurant detail — menu, reviews, delivery info | ✅ Done |
| `/restaurants/[id]/item/[itemId]` | Food item detail — extras, qty, add to cart | ✅ Done |
| `/cart` | Cart — items, quantities, promo code, total | ✅ Done |
| `/checkout` | Checkout — address, payment, order summary | ✅ Done |
| `/order-confirmed` | Order confirmed — confirmation screen | ✅ Done |
| `/orders` | Order history list | ✅ Done |
| `/orders/[id]` | Order detail + live status tracking | ✅ Done |
| `/profile` | User profile — info, addresses, payment methods | ✅ Done |
| `/favorites` | Saved/favourited restaurants and items | ✅ Done |

---

## Folder Structure

```
src/
  app/
    page.tsx                        ← Landing page (done)
    layout.tsx                      ← Root layout (done)
    globals.css                     ← Tailwind v4 + CSS vars (done)
    login/
      page.tsx
    signup/
      page.tsx
    forgot-password/
      page.tsx
    restaurants/
      page.tsx
      [id]/
        page.tsx
        item/[itemId]/page.tsx
    cart/
      page.tsx
    checkout/
      page.tsx
    order-confirmed/
      page.tsx
    orders/
      page.tsx
      [id]/page.tsx
    profile/
      page.tsx
    favorites/
      page.tsx

  components/
    layout/
      Navbar.tsx       ← Sticky top nav (done)
      Footer.tsx       ← Footer links (done)
    sections/          ← Landing page sections (all done)
      HeroSection.tsx
      CategorySection.tsx
      FeaturedRestaurants.tsx
      PromoBanner.tsx
      HowItWorks.tsx
      AppDownload.tsx
    ui/
      RestaurantCard.tsx   ← Reusable restaurant card (done)
      FoodCard.tsx         ← Food item card (to build)
      CategoryPill.tsx     ← Filter/category chip (to build)
      StarRating.tsx       ← Star rating display (to build)
      QuantitySelector.tsx ← +/- quantity control (to build)
      OrderStatusBadge.tsx ← Status pill (to build)
      AddressCard.tsx      ← Saved address display (to build)
      Modal.tsx            ← Generic modal wrapper (to build)
      EmptyState.tsx       ← Empty/no-results state (to build)
    forms/
      LoginForm.tsx
      SignupForm.tsx
      CheckoutForm.tsx
      AddressForm.tsx
```

---

## Screen-by-Screen Design Spec

### 1. `/login` — Login
- Centred card layout (`max-w-md mx-auto`) on a `bg-gray-50` page
- CraveExpress logo at top
- Fields: Email, Password (show/hide toggle)
- Primary CTA: "Login" (full-width, orange pill button)
- Divider: "or continue with" → Google OAuth placeholder button
- Links: "Forgot password?" → `/forgot-password` | "Don't have an account? Sign up" → `/signup`

### 2. `/signup` — Sign Up
- Same centred card as login
- Fields: Full name, Email, Phone, Password, Confirm password
- CTA: "Create Account"
- Link: "Already have an account? Login"

### 3. `/forgot-password` — Forgot Password
- Email input + "Send Reset Link" CTA
- Success state: confirmation message with envelope icon

### 4. `/restaurants` — Restaurant Listing
- Sticky filter bar: search input + category pills (Pizza, Burgers, Healthy, Sushi, Desserts, Nepali, Drinks)
- Sort dropdown: Popular | Fastest | Highest Rated | Nearest
- Active filters shown as removable chips
- Grid of `RestaurantCard` (2 cols mobile → 3 cols desktop)
- Skeleton loading state for cards

### 5. `/restaurants/[id]` — Restaurant Detail
- Full-width banner image (h-56) with back button overlay
- Restaurant info block: name, cuisine tags, rating, delivery time, fee
- Sticky horizontal tab bar: menu categories (Starters, Mains, Drinks, Desserts...)
- Food item list per category: `FoodCard` rows — image thumbnail, name, description, price, "Add" button
- Reviews section: star breakdown + list of user reviews
- Delivery info card: estimated time, fee, minimum order

### 6. `/restaurants/[id]/item/[itemId]` — Food Detail
- Large food image (top half)
- Name, description, price
- `QuantitySelector` (+/-)
- Add-ons section (checklist of extras with prices)
- Sticky bottom bar: "Add to Cart — $X.XX"

### 7. `/cart` — Cart
- Item rows: thumbnail, name, restaurant, quantity control, price, remove button
- Grouped by restaurant
- Promo code input + "Apply" button
- Price breakdown: Subtotal, Delivery fee, Discount, **Total**
- CTA: "Proceed to Checkout" (orange, full-width)
- Empty state if cart is empty

### 8. `/checkout` — Checkout
- Two-column layout (desktop): left = form, right = order summary
- Delivery address: saved address cards + "Add New Address" expand-form
- Payment: Cash on Delivery radio | Stripe card input (placeholder)
- Order summary: item list, price breakdown, promo code display
- CTA: "Place Order" → goes to `/order-confirmed`

### 9. `/order-confirmed` — Order Confirmed
- Full-page centred layout
- Large green checkmark animation
- "Order Placed!" heading + order number
- Brief summary: items, estimated delivery time
- CTA: "Track Order" → `/orders/[id]` | "Back to Home"

### 10. `/orders/[id]` — Order Tracking
- Status progress bar: **Order Placed → Preparing → Out for Delivery → Delivered**
- Active step highlighted in orange
- Estimated delivery time countdown
- Delivery person info card (name, photo placeholder, phone icon)
- Items list below
- Map placeholder div (grey box with pin icon — real map integration is backend phase)

### 11. `/orders` — Order History
- List of past orders — grouped by date
- Each row: restaurant name, items count, total, date, status badge, "Reorder" button
- Clicking a row → `/orders/[id]`

### 12. `/profile` — User Profile
- Avatar circle with upload icon
- Editable fields: name, email, phone
- "Saved Addresses" section with `AddressCard` list + "Add Address" button
- "Logout" button (outlined, red text)
- "Delete Account" link (small, red, at bottom)

### 13. `/favorites` — Favourites
- Same grid layout as `/restaurants`
- Empty state if no favourites saved

---

## Build Order (frontend only, no backend)

All data is **static mock data** — define it in `src/data/` as typed TypeScript files.

1. ✅ Landing page
2. Auth pages — login, signup, forgot-password (UI only, no real auth)
3. Restaurant listing `/restaurants`
4. Restaurant detail `/restaurants/[id]`
5. Food detail `/restaurants/[id]/item/[itemId]`
6. Cart `/cart` (use React Context for cart state)
7. Checkout `/checkout`
8. Order confirmed `/order-confirmed`
9. Order tracking `/orders/[id]`
10. Order history `/orders`
11. User profile `/profile`
12. Favourites `/favorites`

---

## Mock Data Location
All mock data lives in `src/data/`:
- `restaurants.ts` — array of restaurant objects
- `menuItems.ts` — food items keyed by restaurant id
- `orders.ts` — sample past orders
- `user.ts` — sample user profile
- `categories.ts` — food categories list

---

## State Management
- **Cart**: React Context + `useReducer` — `src/context/CartContext.tsx`
- **Auth state**: React Context — `src/context/AuthContext.tsx` (mock, no real auth)
- **No external state library** (Redux, Zustand etc.) — keep it simple for portfolio

---

## Coding Rules
- All interactive components (useState, useEffect, event handlers) → `"use client"` directive at top
- Server Components by default for pages that only display data
- No inline styles — Tailwind classes only
- No comments unless a non-obvious workaround
- TypeScript strict — no `any`, always type props interfaces
- Image src must be an `https://images.unsplash.com/...` URL with `?w=X&h=Y&fit=crop&q=80` params
