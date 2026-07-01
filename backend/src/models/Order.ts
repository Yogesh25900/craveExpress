import { Schema, model, Document, Types } from "mongoose";
import { encryptIfNeeded, safeDecryptPii } from "../utils/pii";

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

export interface IOrderAddon {
  name: string;
  price: number;
}

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  image: string;
  price: number;
  quantity: number;
  selectedAddons: IOrderAddon[];
}

export interface IOrderAddress {
  label: string;
  street: string;
  city: string;
  zip: string;
}

export interface IRiderLocation {
  lat: number;
  lng: number;
  updatedAt: Date;
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  restaurantSlug: string;
  restaurantName: string;
  restaurantImage: string;
  items: IOrderItem[];
  status: OrderStatus;
  address: IOrderAddress;
  paymentMethod: "cod" | "card" | "esewa";
  subtotal: number;
  deliveryFee: number;
  discount: number;
  promoCode?: string;
  total: number;
  notes?: string;
  payment?: {
    provider: "esewa";
    status: "pending" | "paid" | "failed";
    transactionUuid?: string;
    ref?: string;
    paidAt?: Date;
  };
  estimatedDeliveryMins: number;
  statusHistory: { status: OrderStatus; at: Date }[];
  placedAt: Date;
  // Rider fields
  riderId?: Types.ObjectId;
  riderName?: string;
  riderPhone?: string;
  riderLocation?: IRiderLocation;
  assignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderAddonSchema = new Schema<IOrderAddon>(
  { name: String, price: Number },
  { _id: false }
);

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId:     { type: Schema.Types.ObjectId, required: true },
    name:           { type: String, required: true },
    image:          { type: String, default: "" },
    price:          { type: Number, required: true },
    quantity:       { type: Number, required: true, min: 1 },
    selectedAddons: [orderAddonSchema],
  },
  { _id: false }
);

const orderAddressSchema = new Schema<IOrderAddress>(
  {
    label:  { type: String, default: "Home" },
    street: { type: String, required: true },
    city:   { type: String, default: "" },
    zip:    { type: String, default: "" },
  },
  { _id: false }
);

const riderLocationSchema = new Schema<IRiderLocation>(
  {
    lat:       { type: Number, required: true },
    lng:       { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    restaurantId:   { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    restaurantSlug: { type: String, default: "" },
    restaurantName: { type: String, required: true },
    restaurantImage:{ type: String, default: "" },
    items:          [orderItemSchema],
    status:         {
      type: String,
      enum: ["placed", "accepted", "rejected", "preparing", "ready_for_pickup", "picked_up", "out_for_delivery", "delivered", "cancelled"],
      default: "placed",
    },
    address:        { type: orderAddressSchema, required: true },
    paymentMethod:  { type: String, enum: ["cod", "card", "esewa"], default: "cod" },
    payment: {
      provider:        { type: String, enum: ["esewa"] },
      status:          { type: String, enum: ["pending", "paid", "failed"] },
      transactionUuid: { type: String },
      ref:             { type: String },
      paidAt:          { type: Date },
    },
    subtotal:       { type: Number, required: true },
    deliveryFee:    { type: Number, default: 0 },
    discount:       { type: Number, default: 0 },
    promoCode:      { type: String },
    total:          { type: Number, required: true },
    notes:          { type: String },
    estimatedDeliveryMins: { type: Number, default: 35 },
    statusHistory:  [{ status: String, at: Date }],
    placedAt:       { type: Date, default: Date.now },
    // Rider assignment
    riderId:        { type: Schema.Types.ObjectId, ref: "User", sparse: true },
    riderName:      { type: String },
    riderPhone:     { type: String },
    riderLocation:  { type: riderLocationSchema },
    assignedAt:     { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ riderId: 1, status: 1 });

// ── PII encryption hooks ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function encryptOrderPii(doc: any): void {
  if (!doc) return;
  if (doc.address) {
    if (doc.address.street) doc.address.street = encryptIfNeeded(doc.address.street);
    if (doc.address.city)   doc.address.city   = encryptIfNeeded(doc.address.city);
    if (doc.address.zip)    doc.address.zip    = encryptIfNeeded(doc.address.zip);
  }
  if (doc.riderPhone) doc.riderPhone = encryptIfNeeded(doc.riderPhone);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decryptOrderPii(doc: any): void {
  if (!doc) return;
  if (doc.address) {
    if (doc.address.street) doc.address.street = safeDecryptPii(doc.address.street);
    if (doc.address.city)   doc.address.city   = safeDecryptPii(doc.address.city);
    if (doc.address.zip)    doc.address.zip    = safeDecryptPii(doc.address.zip);
  }
  if (doc.riderPhone) doc.riderPhone = safeDecryptPii(doc.riderPhone);
}

// Encrypt before every save
orderSchema.pre("save", function () { encryptOrderPii(this); });

// Decrypt after every save so the in-memory document stays readable
orderSchema.post("save", function (doc: unknown) { decryptOrderPii(doc); });

// Decrypt after every find/findOne (handles lean + non-lean results)
orderSchema.post("find",             function (docs: unknown[]) { docs.forEach(decryptOrderPii); });
orderSchema.post("findOne",          function (doc:  unknown)   { decryptOrderPii(doc); });
orderSchema.post("findOneAndUpdate", function (doc:  unknown)   { decryptOrderPii(doc); });

export const Order = model<IOrder>("Order", orderSchema);
