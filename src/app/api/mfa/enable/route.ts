import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL, getSessionUser, getTokens, refreshTokens, sameOrigin, setSession } from "@/lib/server/session";

/** Activation de la 2FA, étape 2 : le premier code valide l'appareil ; la session devient « 2FA ». */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ message: "Origine refusée" }, { status: 403 });
  const { access: a, refresh } = await getTokens();
  const access = a ?? (refresh ? await refreshTokens(refresh) : null);
  const user = await getSessionUser();
  if (!access || !user || !refresh) return NextResponse.json({ message: "Session expirée" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const res = await fetch(`${API_URL}/auth/mfa/enable`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code: body.code }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message ?? "Code incorrect" }, { status: res.status });
  // Même session, nouveau jeton d'accès portant la 2FA ; le refresh token reste valable.
  await setSession({ accessToken: data.accessToken, refreshToken: (await cookies()).get("pedago_rt")?.value ?? refresh, expiresIn: data.expiresIn }, { ...user, mfa: true });
  return NextResponse.json({ recoveryCodes: data.recoveryCodes });
}
