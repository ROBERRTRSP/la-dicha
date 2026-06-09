import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPlayerAccount } from "@/lib/cajero-service";

export async function GET() {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const players = await prisma.user.findMany({
    where: { role: "JUGADOR", active: true },
    include: { wallet: { select: { balance: true } } },
    orderBy: { fullName: "asc" },
    take: 200,
  });

  return NextResponse.json({
    players: players.map((p) => ({
      id: p.id,
      username: p.username,
      fullName: p.fullName,
      phone: p.phone,
      balance: p.wallet?.balance ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { username, fullName, phone, password, initialBalance } =
      await request.json();
    const user = await createPlayerAccount({
      username: String(username),
      fullName: String(fullName),
      phone: phone ? String(phone) : undefined,
      password: password ? String(password) : undefined,
      initialBalance: Number(initialBalance) || 0,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        balance: user.wallet?.balance ?? 0,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear jugador.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
