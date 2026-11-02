import mongoose, { Schema, Types } from "mongoose";

type UserRole = "shopper" | "seller" | "admin";
type SellerStatus = "not_applicable" | "pending" | "approved" | "rejected";
type ProductStatus = "pending" | "active" | "rejected" | "archived";
type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "expired";

export type UserRecord = {
  createdAt?: Date;
  updatedAt?: Date;
  name: string;
  email: string;
  passwordHash: string;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  passwordResetRequestedAt?: Date;
  role: UserRole;
  sellerStatus: SellerStatus;
  storeName?: string;
};
export type ProductRecord = {
  createdAt?: Date;
  updatedAt?: Date;
  sellerId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  category: string;
  priceCents: number;
  compareAtCents?: number;
  stock: number;
  imageUrl: string;
  status: ProductStatus;
  featured: boolean;
};
export type OrderLineRecord = {
  productId: Types.ObjectId;
  sellerId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPriceCents: number;
  imageUrl: string;
  commissionPercent: number;
  platformFeeCents: number;
  sellerPayoutCents: number;
  payoutStatus: "unpaid" | "paid";
  payoutReference?: string;
};
export type OrderRecord = {
  createdAt?: Date;
  updatedAt?: Date;
  customerId: Types.ObjectId;
  lines: OrderLineRecord[];
  totalCents: number;
  currency: "usd";
  status: OrderStatus;
  stripeSessionId?: string;
  inventoryReleased: boolean;
  shippingAddress?: {
    name?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  };
};
type StripeEventRecord = { eventId: string; type: string };

const userSchema = new Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    passwordResetTokenHash: { type: String, select: false, index: true, sparse: true },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetRequestedAt: { type: Date, select: false },
    role: { type: String, enum: ["shopper", "seller", "admin"], required: true },
    sellerStatus: {
      type: String,
      enum: ["not_applicable", "pending", "approved", "rejected"],
      default: "not_applicable",
    },
    storeName: { type: String, trim: true, maxlength: 100 },
  },
  { timestamps: true },
);

const productSchema = new Schema<ProductRecord>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, maxlength: 3000 },
    category: { type: String, required: true, maxlength: 60, index: true },
    priceCents: { type: Number, required: true, min: 50 },
    compareAtCents: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ["pending", "active", "rejected", "archived"], default: "pending", index: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const orderLineSchema = new Schema<OrderLineRecord>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
    commissionPercent: { type: Number, required: true, min: 0, max: 30 },
    platformFeeCents: { type: Number, required: true, min: 0 },
    sellerPayoutCents: { type: Number, required: true, min: 0 },
    payoutStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    payoutReference: { type: String, maxlength: 120 },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderRecord>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lines: { type: [orderLineSchema], required: true },
    totalCents: { type: Number, required: true },
    currency: { type: String, enum: ["usd"], default: "usd" },
    status: { type: String, enum: ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "expired"], default: "pending", index: true },
    stripeSessionId: { type: String, index: { sparse: true, unique: true } },
    inventoryReleased: { type: Boolean, default: false },
    shippingAddress: {
      name: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postal_code: String,
      country: String,
    },
  },
  { timestamps: true },
);

const stripeEventSchema = new Schema<StripeEventRecord>(
  { eventId: { type: String, required: true, unique: true }, type: { type: String, required: true } },
  { timestamps: true },
);

export const User = (mongoose.models.User as mongoose.Model<UserRecord> | undefined) ?? mongoose.model<UserRecord>("User", userSchema);
export const Product = (mongoose.models.Product as mongoose.Model<ProductRecord> | undefined) ?? mongoose.model<ProductRecord>("Product", productSchema);
export const Order = (mongoose.models.Order as mongoose.Model<OrderRecord> | undefined) ?? mongoose.model<OrderRecord>("Order", orderSchema);
export const StripeEvent = (mongoose.models.StripeEvent as mongoose.Model<StripeEventRecord> | undefined) ?? mongoose.model<StripeEventRecord>("StripeEvent", stripeEventSchema);
