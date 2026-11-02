import assert from "node:assert/strict";
import test from "node:test";
import { calculateSellerSplit, getCommissionPercent, getShippingCents } from "../src/lib/commerce";
import { categories, demoProducts } from "../src/lib/catalog";
import { cartSchema, productSchema, registerSchema } from "../src/lib/validation";

test("catalog preview spans the planned departments with a broad sample range", () => {
  assert.equal(demoProducts.length, 36);
  assert.deepEqual(new Set(demoProducts.map((product) => product.category)), new Set(categories.slice(1)));
  assert.equal(new Set(demoProducts.map((product) => product.id)).size, demoProducts.length);
  assert.equal(categories.length, 13);
  assert.ok(demoProducts.some((product) => product.price < product.compareAt));
});

test("commission and seller payout are rounded and snapshotted per order item", () => {
  assert.deepEqual(calculateSellerSplit(2100, 3, 15), {
    itemSubtotalCents: 6300,
    platformFeeCents: 945,
    sellerPayoutCents: 5355,
  });
  assert.equal(calculateSellerSplit(199, 1, 15).sellerPayoutCents, 169);
  assert.equal(getCommissionPercent("15"), 15);
});

test("invalid marketplace commission settings fail explicitly", () => {
  assert.throws(() => getCommissionPercent("31"), /from 0 to 30/);
  assert.throws(() => getCommissionPercent("not-a-number"), /from 0 to 30/);
});

test("free shipping starts at the configured merchandise threshold", () => {
  assert.equal(getShippingCents(7499), 795);
  assert.equal(getShippingCents(7500), 0);
});

test("seller application requires a shop name and strong password", () => {
  const base = { name: "Jamie Seller", email: "jamie@example.com", password: "a-secure-password-2026", role: "seller" };
  assert.equal(registerSchema.safeParse({ ...base, storeName: "Sunny Studio" }).success, true);
  assert.equal(registerSchema.safeParse(base).success, false);
  assert.equal(registerSchema.safeParse({ ...base, storeName: "Sunny Studio", password: "short" }).success, false);
  assert.equal(registerSchema.safeParse({ ...base, role: "shopper" }).success, true);
  assert.equal(registerSchema.safeParse({ ...base, role: "admin", storeName: "Admin Shop" }).success, false);
});

test("product schema only accepts HTTPS images from approved CDN hosts", () => {
  const product = {
    name: "A useful thing",
    description: "A well-made thing that makes an ordinary day better.",
    category: "Home & living",
    priceCents: 1500,
    compareAtCents: 2000,
    stock: 5,
    imageUrl: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9",
  };
  assert.equal(productSchema.safeParse(product).success, true);
  assert.equal(productSchema.safeParse({ ...product, imageUrl: "http://images.unsplash.com/photo" }).success, false);
  assert.equal(productSchema.safeParse({ ...product, imageUrl: "https://example.com/image.jpg" }).success, false);
  assert.equal(productSchema.safeParse({ ...product, compareAtCents: 1000 }).success, false);
});

test("checkout cart quantities and product ids are bounded", () => {
  assert.equal(cartSchema.safeParse({ items: [{ productId: "a".repeat(24), quantity: 2 }] }).success, true);
  assert.equal(cartSchema.safeParse({ items: [{ productId: "not-an-object-id", quantity: 2 }] }).success, false);
  assert.equal(cartSchema.safeParse({ items: [{ productId: "a".repeat(24), quantity: 21 }] }).success, false);
});
