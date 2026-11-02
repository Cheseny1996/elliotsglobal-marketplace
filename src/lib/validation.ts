import { z } from "zod";

const passwordSchema = z.string().min(12).max(128).refine(
  (value) => Buffer.byteLength(value, "utf8") <= 72,
  "Password must not exceed 72 UTF-8 bytes.",
);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: passwordSchema,
  role: z.enum(["shopper", "seller", "fan", "candidate"]),
  storeName: z.string().trim().min(2).max(100).optional(),
}).refine((value) => value.role !== "seller" || Boolean(value.storeName), {
  path: ["storeName"],
  message: "Store name is required for seller accounts.",
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: passwordSchema,
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const passwordResetSchema = z.object({
  token: z.string().regex(/^[a-f\d]{64}$/i),
  password: passwordSchema,
});

export const productSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(12).max(3000),
  category: z.string().trim().min(2).max(60),
  priceCents: z.number().int().min(50).max(1_000_000),
  compareAtCents: z.number().int().min(0).max(1_000_000).optional(),
  stock: z.number().int().min(0).max(100_000),
  imageUrl: z.string().url().max(1000).refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && [
      "images.unsplash.com",
      "images.pexels.com",
      "cdn.shopify.com",
      "storage.googleapis.com",
    ].includes(url.hostname);
  }, "Use a secure image URL from an approved image host."),
}).refine((value) => value.compareAtCents === undefined || value.compareAtCents >= value.priceCents, {
  path: ["compareAtCents"],
  message: "Compare-at price must be at least the product price.",
});

export const cartSchema = z.object({
  items: z.array(z.object({
    productId: z.string().regex(/^[a-f\d]{24}$/i),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(30),
});
