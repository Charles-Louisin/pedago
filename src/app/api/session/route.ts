import { NextResponse } from "next/server";
import { API_URL, clearSession, getSessionUser, getTokens, setSession } from "@/lib/server/session";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { identifier?: string; password?: string };
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "" },
    body: JSON.stringify({ identifier: body.identifier, password: body.password, device: "Admin web" }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message ?? "Connexion impossible" }, { status: res.status });
  // Le tableau de bord est réservé à l'équipe éditoriale.
  if (data.user.role === "teacher") {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${data.accessToken}` } });
    return NextResponse.json({ message: "Ce compte n'a pas accès à l'administration" }, { status: 403 });
  }
  await setSession(data, data.user);
  return NextResponse.json({ user: data.user });
}

export async function DELETE() {
  const { access } = await getTokens();
  if (access) await fetch(`${API_URL}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${access}` } }).catch(() => undefined);
  await clearSession();
  return new NextResponse(null, { status: 204 });
}
