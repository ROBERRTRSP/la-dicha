import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "la-dicha-dev-secret"
);

type Session = { userId: string; role: string };

async function readSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("la_dicha_session")?.value;
  const session = await readSession(token);

  const isPlayer =
    pathname.startsWith("/jugar") ||
    pathname.startsWith("/ruleta") ||
    pathname.startsWith("/tickets") ||
    pathname.startsWith("/resultados");
  const isLogin = pathname === "/login";
  const isAdminLogin = pathname === "/admin/login";
  const isCajeroLogin = pathname === "/cajero/login";
  const isAdminPanel =
    pathname.startsWith("/admin") && !isAdminLogin;
  const isCajeroPanel =
    pathname.startsWith("/cajero") && !isCajeroLogin;

  if (isAdminPanel && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isCajeroPanel && session?.role !== "CAJERO") {
    return NextResponse.redirect(new URL("/cajero/login", request.url));
  }

  if (isAdminLogin && session?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isCajeroLogin && session?.role === "CAJERO") {
    return NextResponse.redirect(new URL("/cajero", request.url));
  }

  if (isPlayer && !session) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    if (token) res.cookies.delete("la_dicha_session");
    return res;
  }

  if (isPlayer && session) {
    if (session.role === "CAJERO") {
      return NextResponse.redirect(new URL("/cajero", request.url));
    }
    if (session.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (session.role !== "JUGADOR") {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete("la_dicha_session");
      return res;
    }
  }

  if (isLogin && session?.role === "CAJERO") {
    return NextResponse.redirect(new URL("/cajero", request.url));
  }

  if (isLogin && session?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isLogin && session?.role === "JUGADOR") {
    return NextResponse.redirect(new URL("/jugar", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/jugar/:path*",
    "/ruleta/:path*",
    "/tickets/:path*",
    "/resultados/:path*",
    "/login",
    "/admin/:path*",
    "/cajero/:path*",
  ],
};
