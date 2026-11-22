import { NextResponse } from "next/server";
import { API_URL, getTokens, sameOrigin } from "@/lib/server/session";

/** Nouveau code de vérification par e-mail (45 s minimum entre deux envois, contrôlé par l'API). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ message: "Origine refusée" }, { status: 403 });
  const { access } = await getTokens();
  if (!access) return NextResponse.json({ message: "Session expirée : reconnecte-toi" }, { status: 401 });
  const res = await fetch(`${API_URL}/auth/resend-code`, { method: "POST", headers: { Authorization: `Bearer ${access}` }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message ?? "Envoi impossible" }, { status: res.status });
  return NextResponse.json({ sent: data.sent !== false, ...(process.env.NODE_ENV !== "production" && data.devCode ? { devCode: data.devCode } : {}) });
}
