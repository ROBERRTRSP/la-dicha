import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { wallet: { select: { balance: true } } },
    take: 200,
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      active: u.active,
      balance: u.wallet?.balance ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { username, fullName, phone, role, password, initialBalance } =
      await request.json();

    if (!username || !fullName) {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }

    const r = role === "CAJERO" || role === "ADMIN" ? role : "JUGADOR";
    const uname = String(username).toLowerCase().trim();
    const exists = await prisma.user.findUnique({ where: { username: uname } });
    if (exists) {
      return NextResponse.json({ error: "Usuario ya existe." }, { status: 400 });
    }

    const pwd = String(password ?? "").trim();
    if (pwd.length < 4) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 4 caracteres." },
        { status: 400 }
      );
    }

    const balance =
      r === "JUGADOR"
        ? Math.max(0, Number(initialBalance) || 0)
        : 0;
    if (r === "JUGADOR" && Number(initialBalance) < 0) {
      return NextResponse.json(
        { error: "El saldo inicial no puede ser negativo." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(pwd);

    const user = await prisma.user.create({
      data: {
        username: uname,
        fullName: String(fullName).trim(),
        phone: phone ? String(phone) : null,
        role: r,
        passwordHash,
        wallet:
          r === "JUGADOR"
            ? { create: { balance } }
            : undefined,
      },
      include: { wallet: true },
    });

    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear usuario.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const { id, active, password } = body as {
    id?: string;
    active?: boolean;
    password?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "Usuario no indicado." }, { status: 400 });
  }

  const data: { active?: boolean; passwordHash?: string } = {};

  if (typeof active === "boolean") {
    data.active = active;
  }

  if (password !== undefined) {
    const next = String(password).trim();
    if (next.length < 4) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 4 caracteres." },
        { status: 400 }
      );
    }
    data.passwordHash = await hashPassword(next);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    user: { id: user.id, active: user.active, passwordUpdated: !!data.passwordHash },
  });
}
