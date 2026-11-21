import { NextResponse, type NextRequest } from "next/server";
import { API_URL, clearSession, getTokens, refreshTokens, sameOrigin } from "@/lib/server/session";

/**
 * Proxy vers l'API : seules les routes admin et bibliothèque sont relayées.
 * Corps relayés tels quels (octets) : JSON, envoi de fichier (multipart, 30 Mo au plus) et PDF en retour.
 */
const ALLOWED = /^(admin|library)\//;
const MAX_UPLOAD = 30 * 1024 * 1024;

async function forward(req: NextRequest, path: string[]) {
  const target = path.join("/");
  if (!ALLOWED.test(target)) return NextResponse.json({ message: "Route non autorisée" }, { status: 404 });
  // Protection CSRF en plus des cookies SameSite : les écritures doivent venir de l'admin lui-même.
  if (req.method !== "GET" && !sameOrigin(req)) return NextResponse.json({ message: "Origine refusée" }, { status: 403 });
  let { access } = await getTokens();
  const { refresh } = await getTokens();
  if (!access && refresh) access = (await refreshTokens(refresh)) ?? undefined;
  if (!access) return NextResponse.json({ message: "Session expirée" }, { status: 401 });

  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD) return NextResponse.json({ message: "Fichier trop lourd (30 Mo maximum)" }, { status: 413 });
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  if (body && body.byteLength > MAX_UPLOAD) return NextResponse.json({ message: "Fichier trop lourd (30 Mo maximum)" }, { status: 413 });
  // Type d'origine conservé (multipart avec sa frontière) ; JSON par défaut.
  const type = req.headers.get("content-type") ?? "application/json";
  const send = (token: string) =>
    fetch(`${API_URL}/${target}${req.nextUrl.search}`, {
      method: req.method,
      headers: { Authorization: `Bearer ${token}`, ...(body && body.byteLength ? { "Content-Type": type } : {}) },
      body: body && body.byteLength ? body : undefined,
      cache: "no-store",
    });

  let res = await send(access);
  if (res.status === 401 && refresh) {
    const fresh = await refreshTokens(refresh);
    if (fresh) res = await send(fresh);
  }
  if (res.status === 401) await clearSession();
  // Octets relayés sans conversion (un PDF reste un PDF) ; affichage en ligne, jamais mis en cache.
  const data = await res.arrayBuffer();
  const headers: Record<string, string> = { "Content-Type": res.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const disposition = res.headers.get("content-disposition");
  if (disposition) headers["Content-Disposition"] = disposition;
  return new NextResponse(data.byteLength ? data : null, { status: res.status, headers });
}

type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
export async function POST(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
export async function PUT(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
export async function PATCH(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
export async function DELETE(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
