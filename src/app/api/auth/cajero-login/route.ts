import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
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

    if (!user || !user.active || user.role !== "CAJERO") {
      return NextResponse.json(
        { error: "Acceso de cajero denegado." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Acceso de cajero denegado." },
        { status: 401 }
      );
    }

    await createSession(user.id, user.role);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
