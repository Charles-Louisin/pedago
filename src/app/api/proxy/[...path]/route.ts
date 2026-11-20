import { NextResponse, type NextRequest } from "next/server";
import { API_URL, clearSession, getTokens, refreshTokens } from "@/lib/server/session";

/** Proxy vers l'API : seules les routes admin et bibliothèque sont relayées. */
const ALLOWED = /^(admin|library)\//;

async function forward(req: NextRequest, path: string[]) {
  const target = path.join("/");
  if (!ALLOWED.test(target)) return NextResponse.json({ message: "Route non autorisée" }, { status: 404 });
  let { access } = await getTokens();
  const { refresh } = await getTokens();
  if (!access && refresh) access = (await refreshTokens(refresh)) ?? undefined;
  if (!access) return NextResponse.json({ message: "Session expirée" }, { status: 401 });

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  const send = (token: string) =>
    fetch(`${API_URL}/${target}${req.nextUrl.search}`, {
      method: req.method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body,
      cache: "no-store",
    });

  let res = await send(access);
  if (res.status === 401 && refresh) {
    const fresh = await refreshTokens(refresh);
    if (fresh) res = await send(fresh);
  }
  if (res.status === 401) await clearSession();
  const text = await res.text();
  return new NextResponse(text || null, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
}

type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
export async function POST(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
export async function PUT(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
export async function PATCH(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
export async function DELETE(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path); }
