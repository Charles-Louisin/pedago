import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, getSessionUser, getTokens, sameOrigin } from "@/lib/server/session";

/** Confirmation de l'adresse e-mail par le code à 6 chiffres (le jeton d'accès renvoyé porte la vérification). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ message: "Origine refusée" }, { status: 403 });
  const { access } = await getTokens();
  if (!access) return NextResponse.json({ message: "Session expirée : reconnecte-toi" }, { status: 401 });
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const res = await fetch(`${API_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message ?? "Code incorrect" }, { status: res.status });
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  if (data.accessToken) jar.set("pedago_at", data.accessToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 15 * 60 });
  const user = await getSessionUser();
  if (user) jar.set("pedago_user", JSON.stringify({ ...user, emailVerified: true }), { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 30 * 86_400 });
  return NextResponse.json({ verified: true });
}
