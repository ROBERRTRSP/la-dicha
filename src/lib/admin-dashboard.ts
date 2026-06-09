import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "./db";

const TZ = "America/Santo_Domingo";

export async function getAdminDashboardStats() {
  const now = toZonedTime(new Date(), TZ);
  const today = startOfDay(now);

  const [
    playerCount,
    cajeroCount,
    ticketAgg,
    walletAgg,
    openDraws,
    rouletteAgg,
    recentTickets,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "JUGADOR", active: true } }),
    prisma.user.count({ where: { role: "CAJERO", active: true } }),
    prisma.ticket.aggregate({
      where: { createdAt: { gte: today }, status: { not: "CANCELED" } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.wallet.aggregate({ _sum: { balance: true }, _count: true }),
    prisma.draw.count({
      where: {
        drawDate: today,
        status: { in: ["OPEN", "CLOSING_SOON"] },
      },
    }),
    prisma.rouletteBet.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { amount: true, payout: true },
      _count: true,
    }),
    prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { fullName: true, username: true } } },
    }),
  ]);

  const lotterySales = ticketAgg._sum.totalAmount ?? 0;
  const rouletteBet = rouletteAgg._sum.amount ?? 0;
  const roulettePaid = rouletteAgg._sum.payout ?? 0;

  return {
    playerCount,
    cajeroCount,
    ticketsToday: ticketAgg._count,
    lotterySalesToday: lotterySales,
    totalWalletBalance: walletAgg._sum.balance ?? 0,
    walletCount: walletAgg._count,
    openDrawsToday: openDraws,
    rouletteSpinsToday: rouletteAgg._count,
    rouletteBetToday: rouletteBet,
    rouletteHouseProfit: rouletteBet - roulettePaid,
    recentTickets,
  };
}
