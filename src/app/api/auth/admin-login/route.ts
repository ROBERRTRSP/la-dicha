import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import {
  getClientIp,
  getRateLimitStatus,
  LOGIN_RATE,
  rateLimitResponse,
  recordFailedLogin,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rlKey = `login:admin:${ip}`;
    const blocked = getRateLimitStatus(
      rlKey,
      LOGIN_RATE.maxAttempts,
      LOGIN_RATE.windowMs
    );
    if (!blocked.ok) return rateLimitResponse(blocked.retryAfterSec);

    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña requeridos." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: String(username).toLowerCase().trim() },
    });

    if (!user || !user.active || user.role !== "ADMIN") {
      recordFailedLogin(rlKey, LOGIN_RATE.maxAttempts, LOGIN_RATE.windowMs);
      return NextResponse.json(
        { error: "Acceso de administrador denegado." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      recordFailedLogin(rlKey, LOGIN_RATE.maxAttempts, LOGIN_RATE.windowMs);
      return NextResponse.json(
        { error: "Acceso de administrador denegado." },
        { status: 401 }
      );
    }

    await createSession(user.id, user.role);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
