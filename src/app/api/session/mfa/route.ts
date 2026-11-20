import { NextResponse } from "next/server";
import { API_URL, clearMfaChallenge, sameOrigin, setSession, takeMfaChallenge } from "@/lib/server/session";

/** Connexion, étape 2 : code de l'application d'authentification ou code de secours. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ message: "Origine refusée" }, { status: 403 });
  const mfaToken = await takeMfaChallenge();
  if (!mfaToken) return NextResponse.json({ message: "Étape expirée : reconnecte-toi", expired: true }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { code?: string; recoveryCode?: string };
  const res = await fetch(`${API_URL}/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfaToken, code: body.code || undefined, recoveryCode: body.recoveryCode || undefined, device: "Admin web" }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message ?? "Code incorrect" }, { status: res.status });
  await clearMfaChallenge();
  await setSession(data, { ...data.user, mfa: true });
  return NextResponse.json({ user: data.user, recoveryCodesLeft: data.recoveryCodesLeft });
}
