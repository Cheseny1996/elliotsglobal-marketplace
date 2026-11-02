import dotenv from "dotenv";
import mongoose from "mongoose";
import { demoProducts, productImage } from "../src/lib/catalog";
import { Product, User } from "../src/lib/models";

dotenv.config({ path: ".env.local" });

async function seedCatalog() {
  const uri = process.env.MONGODB_URI;
  const sellerEmail = process.env.CATALOG_SELLER_EMAIL?.trim().toLowerCase();
  if (!uri || !sellerEmail) {
    throw new Error("Set MONGODB_URI and CATALOG_SELLER_EMAIL before seeding the sample catalog.");
  }
  await mongoose.connect(uri, { bufferCommands: false });
  const seller = await User.findOne({ email: sellerEmail, role: "seller", sellerStatus: "approved" }).select("_id");
  if (!seller) {
    throw new Error("CATALOG_SELLER_EMAIL must belong to an approved seller account.");
  }
  const results = await Promise.all(demoProducts.map((item) => Product.updateOne(
    { slug: `sample-${item.id}` },
    {
      $setOnInsert: {
        sellerId: seller._id,
        name: item.name,
        slug: `sample-${item.id}`,
        description: item.description,
        category: item.category,
        priceCents: Math.round(item.price * 100),
        compareAtCents: Math.round(item.compareAt * 100),
        stock: 20,
        imageUrl: productImage(item.image),
        status: "active",
        featured: true,
      },
    },
    { upsert: true },
  )));
  const added = results.filter((result) => result.upsertedCount === 1).length;
  console.log(`Sample catalog ready: ${added} products added; existing sample listings left unchanged.`);
}

seedCatalog()
  .catch((error: unknown) => {
    console.error("Could not seed sample catalog.", error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
