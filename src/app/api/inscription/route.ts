import { NextResponse } from "next/server";
import { API_URL, sameOrigin, setSession } from "@/lib/server/session";

/**
 * Inscription depuis le site : un compte utilisateur (enseignant) par défaut, aucun rôle demandé.
 * La session est ouverte tout de suite ; l'adresse e-mail se confirme ensuite par code.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ message: "Origine refusée" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { fullName?: string; email?: string; password?: string; passwordConfirm?: string };
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: b.fullName, email: b.email, password: b.password, passwordConfirm: b.passwordConfirm, device: "Site web" }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message ?? "Inscription impossible", issues: data.issues }, { status: res.status });
  await setSession(data, { ...data.user, mfa: false });
  return NextResponse.json({ ok: true, mailSent: data.mailSent !== false, ...(process.env.NODE_ENV !== "production" && data.devCode ? { devCode: data.devCode } : {}) }, { status: 201 });
}
