import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const wallets = await prisma.wallet.findMany({
    include: {
      user: { select: { username: true, fullName: true, role: true, active: true } },
    },
    orderBy: { balance: "desc" },
    take: 200,
  });

  const txns = await prisma.walletTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { wallet: { include: { user: { select: { fullName: true } } } } },
  });

  return NextResponse.json({
    wallets: wallets.map((w) => ({
      id: w.id,
      userId: w.userId,
      balance: w.balance,
      user: w.user,
    })),
    txns,
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { userId, amount, note } = await request.json();
    const amt = Number(amount);
    if (!userId || !amt || amt === 0) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: String(userId) },
    });
    if (!wallet) {
      return NextResponse.json({ error: "Sin billetera." }, { status: 404 });
    }

    const balanceBefore = wallet.balance;

    const balanceAfter = await prisma.$transaction(async (tx) => {
      if (amt < 0) {
        const updated = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: { gte: -amt } },
          data: { balance: { increment: amt } },
        });
        if (updated.count === 0) {
          throw new Error("Saldo insuficiente.");
        }
      } else {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amt } },
        });
      }

      const fresh = await tx.wallet.findUnique({ where: { id: wallet.id } });
      if (!fresh) throw new Error("Billetera no encontrada.");

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: amt > 0 ? "DEPOSIT" : "ADJUSTMENT",
          amount: amt,
          balanceBefore,
          balanceAfter: fresh.balance,
          note: note ?? `Ajuste admin — ${admin.fullName}`,
        },
      });

      return fresh.balance;
    });

    return NextResponse.json({ balanceAfter });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al ajustar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
