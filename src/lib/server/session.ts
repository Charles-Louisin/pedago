import { cookies } from "next/headers";

export const API_URL = (process.env.PEDAGO_API_URL || "http://localhost:5100/api/v1").replace(/\/$/, "");

const ACCESS = "pedago_at";
const REFRESH = "pedago_rt";
const USER = "pedago_user";
const MFA = "pedago_mfa";
const secure = process.env.NODE_ENV === "production";

/** mfa : session ouverte avec la double authentification (sinon, seule la page Sécurité est accessible). */
export type SessionUser = { id: string; fullName: string; email: string | null; role: "teacher" | "reviewer" | "admin"; mfa?: boolean };

export async function setSession(tokens: { accessToken: string; refreshToken: string; expiresIn: number }, user?: SessionUser) {
  const jar = await cookies();
  const base = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
  jar.set(ACCESS, tokens.accessToken, { ...base, maxAge: tokens.expiresIn });
  jar.set(REFRESH, tokens.refreshToken, { ...base, maxAge: 30 * 86_400 });
  if (user) jar.set(USER, JSON.stringify({ id: user.id, fullName: user.fullName, email: user.email, role: user.role, mfa: Boolean(user.mfa) }), { ...base, maxAge: 30 * 86_400 });
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of [ACCESS, REFRESH, USER, MFA]) jar.delete(name);
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
const refreshing = new Map<string, Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null>>();

/** Un seul rafraîchissement par jeton, même si plusieurs requêtes expirent en même temps. */
export async function refreshTokens(refresh: string) {
  let pending = refreshing.get(refresh);
  if (!pending) {
    pending = doRefresh(refresh).finally(() => setTimeout(() => refreshing.delete(refresh), 10_000));
    refreshing.set(refresh, pending);
  }
  const tokens = await pending;
  if (!tokens) return null;
  await setSession(tokens);
  return tokens.accessToken;
}

async function doRefresh(refresh: string) {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as { accessToken: string; refreshToken: string; expiresIn: number };
}

/** Vérifie que la requête vient de l'admin lui-même (en-têtes Origin ou Sec-Fetch-Site). */
export function sameOrigin(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Étape intermédiaire de connexion : le jeton de 2FA reste côté serveur (cookie httpOnly, 5 min). */
export async function setMfaChallenge(token: string) {
  (await cookies()).set(MFA, token, { httpOnly: true, sameSite: "strict", secure, path: "/api/session", maxAge: 300 });
}

export async function takeMfaChallenge() {
  const jar = await cookies();
  return jar.get(MFA)?.value;
}

export async function clearMfaChallenge() {
  (await cookies()).delete({ name: MFA, path: "/api/session" });
}
