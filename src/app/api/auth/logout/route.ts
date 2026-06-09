import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  await destroySession();
  const next = new URL(request.url).searchParams.get("next") ?? "/login";
  const safe =
    next.startsWith("/") && !next.startsWith("//") ? next : "/login";
  return NextResponse.redirect(new URL(safe, request.url));
}
