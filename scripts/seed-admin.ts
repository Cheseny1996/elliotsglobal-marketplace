import dotenv from "dotenv";
import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../src/lib/models";

dotenv.config({ path: ".env.local" });

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!uri || !email || !password || password.length < 16) {
    throw new Error("Set MONGODB_URI, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 16 characters) before seeding.");
  }
  await mongoose.connect(uri, { bufferCommands: false });
  const passwordHash = await hash(password, 12);
  await User.findOneAndUpdate(
    { email },
    {
      $set: { name: "Elliot’s Global Admin", passwordHash, role: "admin", sellerStatus: "not_applicable" },
      $unset: { storeName: "" },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  console.log("Admin account is ready. Sign in through the marketplace account form.");
}

seedAdmin()
  .catch((error: unknown) => {
    console.error("Could not provision admin account.", error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
