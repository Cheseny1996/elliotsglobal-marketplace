import "server-only";
import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models";

const COOKIE_NAME = "elliotsglobal_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const roles = ["shopper", "seller", "fan", "candidate", "admin"] as const;
const sellerStatuses = ["not_applicable", "pending", "approved", "rejected"] as const;

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Set SESSION_SECRET to a random value of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "shopper" | "seller" | "fan" | "candidate" | "admin";
  sellerStatus: "not_applicable" | "pending" | "approved" | "rejected";
  storeName?: string;
};

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role: "shopper" | "seller" | "fan" | "candidate";
  storeName?: string;
}) {
  await connectToDatabase();
  const passwordHash = await hash(input.password, 12);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    sellerStatus: input.role === "seller" ? "pending" : "not_applicable",
    storeName: input.role === "seller" ? input.storeName : undefined,
  });
  return toSessionUser(user);
}

export async function authenticateUser(email: string, password: string) {
  await connectToDatabase();
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await compare(password, user.passwordHash))) return null;
  return toSessionUser(user);
}

function toSessionUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: SessionUser["role"];
  sellerStatus: SessionUser["sellerStatus"];
  storeName?: string;
}): SessionUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    sellerStatus: user.sellerStatus,
    storeName: user.storeName,
  };
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentSession(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  await connectToDatabase();
  const currentUser = await User.findById(session.id).select("name email role sellerStatus storeName").lean();
  return currentUser ? toSessionUser(currentUser) : null;
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = sessionSecret();
  try {
    const { payload } = await jwtVerify(token, secret);
    const role = roles.find((candidate) => candidate === payload.role);
    const sellerStatus = sellerStatuses.find((candidate) => candidate === payload.sellerStatus);
    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      !role ||
      !sellerStatus
    ) {
      return null;
    }
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role,
      sellerStatus,
      storeName: typeof payload.storeName === "string" ? payload.storeName : undefined,
    };
  } catch {
    return null;
  }
}

export async function requireRole(...roles: SessionUser["role"][]) {
  const user = await getCurrentSession();
  if (!user || !roles.includes(user.role)) return null;
  return user;
}
