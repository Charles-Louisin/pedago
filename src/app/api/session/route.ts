import { NextResponse } from "next/server";
import { API_URL, clearSession, getSessionUser, getTokens, sameOrigin, setMfaChallenge, setSession } from "@/lib/server/session";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ message: "Origine refusée" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { identifier?: string; password?: string };
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: body.identifier, password: body.password, device: "Admin web" }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message ?? "Connexion impossible" }, { status: res.status });
  // Mot de passe correct, double authentification active : on demande le code.
  if (data.mfaRequired) {
    await setMfaChallenge(data.mfaToken);
    return NextResponse.json({ mfaRequired: true });
  }
  // Utilisateur (enseignant) : son espace sur le site ; le tableau de bord reste réservé à l'équipe.
  if (data.user.role === "teacher") {
    await setSession(data, { ...data.user, mfa: false });
    return NextResponse.json({ user: data.user, next: data.user.emailVerified ? "/compte" : "/inscription?etape=code" });
  }
  // Compte de l'équipe sans double authentification : seule la page d'activation est accessible.
  await setSession(data, { ...data.user, mfa: false });
  return NextResponse.json({ user: data.user, mfaSetup: true });
}

export async function DELETE() {
  const { access } = await getTokens();
  if (access) await fetch(`${API_URL}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${access}` } }).catch(() => undefined);
  await clearSession();
  return new NextResponse(null, { status: 204 });
}
