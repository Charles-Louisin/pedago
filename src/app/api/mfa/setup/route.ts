import { NextResponse } from "next/server";
import { API_URL, getTokens, refreshTokens, sameOrigin } from "@/lib/server/session";

/** Activation de la 2FA, étape 1 : nouveau secret (affiché en QR code). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ message: "Origine refusée" }, { status: 403 });
  const { access: a, refresh } = await getTokens();
  const access = a ?? (refresh ? await refreshTokens(refresh) : null);
  if (!access) return NextResponse.json({ message: "Session expirée" }, { status: 401 });
  const res = await fetch(`${API_URL}/auth/mfa/setup`, { method: "POST", headers: { Authorization: `Bearer ${access}` }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(res.ok ? { secret: data.secret, otpauthUrl: data.otpauthUrl } : { message: data.message ?? "Activation impossible" }, { status: res.status });
}
