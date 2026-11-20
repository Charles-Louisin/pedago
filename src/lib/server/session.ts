import { cookies } from "next/headers";

export const API_URL = (process.env.PEDAGO_API_URL || "http://localhost:5100/api/v1").replace(/\/$/, "");

const ACCESS = "pedago_at";
const REFRESH = "pedago_rt";
const USER = "pedago_user";
const secure = process.env.NODE_ENV === "production";

export type SessionUser = { id: string; fullName: string; email: string | null; role: "teacher" | "reviewer" | "admin" };

export async function setSession(tokens: { accessToken: string; refreshToken: string; expiresIn: number }, user?: SessionUser) {
  const jar = await cookies();
  const base = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
  jar.set(ACCESS, tokens.accessToken, { ...base, maxAge: tokens.expiresIn });
  jar.set(REFRESH, tokens.refreshToken, { ...base, maxAge: 30 * 86_400 });
  if (user) jar.set(USER, JSON.stringify({ id: user.id, fullName: user.fullName, email: user.email, role: user.role }), { ...base, maxAge: 30 * 86_400 });
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of [ACCESS, REFRESH, USER]) jar.delete(name);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(USER)?.value;
  if (!raw || !jar.get(REFRESH)) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function getTokens() {
  const jar = await cookies();
  return { access: jar.get(ACCESS)?.value, refresh: jar.get(REFRESH)?.value };
}

/** Rafraîchit le jeton d'accès (rotation du refresh token côté API). */
export async function refreshTokens(refresh: string) {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const tokens = (await res.json()) as { accessToken: string; refreshToken: string; expiresIn: number };
  await setSession(tokens);
  return tokens.accessToken;
}
