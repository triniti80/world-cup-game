import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "wc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "SESSION_SECRET must be at least 32 chars. Generate with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(raw);
}

export type SessionPayload = {
  sub: string;
  userId: number;
  email: string;
  name: string;
  role: "user" | "admin";
  iat: number;
  exp: number;
};

export async function createSession(user: {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
}): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.userId !== "number") return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME as SESSION_COOKIE };
