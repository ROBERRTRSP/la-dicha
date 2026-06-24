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
    const rlKey = `login:jugador:${ip}`;
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

    if (!user || !user.active) {
      recordFailedLogin(rlKey, LOGIN_RATE.maxAttempts, LOGIN_RATE.windowMs);
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      recordFailedLogin(rlKey, LOGIN_RATE.maxAttempts, LOGIN_RATE.windowMs);
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    if (user.role !== "JUGADOR") {
      recordFailedLogin(rlKey, LOGIN_RATE.maxAttempts, LOGIN_RATE.windowMs);
      return NextResponse.json(
        { error: "Esta cuenta no es de jugador." },
        { status: 403 }
      );
    }

    await createSession(user.id, user.role);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, fullName: user.fullName },
    });
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
