import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  closesAtForDraw,
  computeDrawStatus,
  drawAtInTz,
  LOTTERY_CLOSE_MINUTES,
} from "../src/lib/lottery-schedule";
import { dayStartInTz } from "../src/lib/timezone";
import { serializePayoutMultipliers } from "../src/lib/roulette-payouts";
import { DEFAULT_ROULETTE_SETTINGS } from "../src/lib/roulette-settings";

const prisma = new PrismaClient();

/** Horarios según loteriasdominicanas.com */
const LOTTERIES = [
  { code: "LP_DIA", name: "La Primera Día", time: "12:00", category: "DOMINICANA" },
  { code: "LOTEDOM", name: "Quiniela LoteDom", time: "12:00", category: "DOMINICANA" },
  { code: "LS_DIA", name: "La Suerte 12:30", time: "12:30", category: "DOMINICANA" },
  { code: "QREAL", name: "Quiniela Real", time: "12:55", category: "DOMINICANA" },
  { code: "GANAMAS", name: "Gana Más", time: "14:30", category: "DOMINICANA" },
  { code: "LS_TARDE", name: "La Suerte 18:00", time: "18:00", category: "DOMINICANA" },
  { code: "LOTEKA", name: "Quiniela Loteka", time: "19:55", category: "DOMINICANA" },
  { code: "LP_NOCHE", name: "La Primera Noche", time: "20:00", category: "DOMINICANA" },
  { code: "LEIDSA", name: "Quiniela Leidsa", time: "20:55", category: "DOMINICANA" },
  { code: "NAC_NOCHE", name: "Lotería Nacional Noche", time: "21:00", category: "DOMINICANA" },
  { code: "ANG_10", name: "Anguila Mañana", time: "10:00", category: "EXTRANJERA" },
  { code: "KING_AM", name: "King Lottery 12:30", time: "12:30", category: "EXTRANJERA" },
  { code: "ANG_1", name: "Anguila Medio Día", time: "13:00", category: "EXTRANJERA" },
  { code: "FL_AM", name: "Florida Día", time: "13:30", category: "EXTRANJERA" },
  { code: "NY_AM", name: "New York Tarde", time: "14:30", category: "EXTRANJERA" },
  { code: "ANG_6", name: "Anguila Tarde", time: "18:00", category: "EXTRANJERA" },
  { code: "KING_PM", name: "King Lottery 7:30", time: "19:30", category: "EXTRANJERA" },
  { code: "ANG_9", name: "Anguila Noche", time: "21:00", category: "EXTRANJERA" },
  { code: "FL_PM", name: "Florida Noche", time: "21:50", category: "EXTRANJERA" },
  { code: "NY_PM", name: "New York Noche", time: "22:30", category: "EXTRANJERA" },
];

async function main() {
  const activeCodes = new Set(LOTTERIES.map((l) => l.code));
  await prisma.lottery.updateMany({
    where: { code: { notIn: [...activeCodes] } },
    data: { active: false },
  });

  for (const lot of LOTTERIES) {
    const logoUrl = `/logos/${lot.code}.png`;
    const lottery = await prisma.lottery.upsert({
      where: { code: lot.code },
      update: {
        name: lot.name,
        drawTime: lot.time,
        category: lot.category,
        logoUrl,
        closeMin: LOTTERY_CLOSE_MINUTES,
        active: true,
      },
      create: {
        code: lot.code,
        name: lot.name,
        logoUrl,
        drawTime: lot.time,
        category: lot.category,
        closeMin: LOTTERY_CLOSE_MINUTES,
        active: true,
        schedules: {
          create: {
            drawTime: lot.time,
            daysOfWeek: "0,1,2,3,4,5,6",
            closeMin: LOTTERY_CLOSE_MINUTES,
          },
        },
      },
    });
    await prisma.schedule.updateMany({
      where: { lotteryId: lottery.id },
      data: { drawTime: lot.time, closeMin: LOTTERY_CLOSE_MINUTES },
    });
  }

  await prisma.lottery.updateMany({
    where: { active: true },
    data: { closeMin: LOTTERY_CLOSE_MINUTES },
  });
  await prisma.schedule.updateMany({
    data: { closeMin: LOTTERY_CLOSE_MINUTES },
  });

  const now = new Date();
  const today = dayStartInTz(now);

  for (const lot of LOTTERIES) {
    const lottery = await prisma.lottery.findUnique({ where: { code: lot.code } });
    if (!lottery) continue;
    const drawAt = drawAtInTz(lot.time, today);
    const closesAt = closesAtForDraw(lot.time, today, LOTTERY_CLOSE_MINUTES);
    const status = computeDrawStatus(now, drawAt, closesAt);

    await prisma.draw.upsert({
      where: { lotteryId_drawDate: { lotteryId: lottery.id, drawDate: today } },
      update: { status, closesAt, drawTime: lot.time },
      create: {
        lotteryId: lottery.id,
        drawDate: today,
        drawTime: lot.time,
        closesAt,
        status,
      },
    });
  }

  const pwd = await bcrypt.hash("1234", 12);

  const demo = await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      username: "demo",
      passwordHash: pwd,
      fullName: "Jugador Demo",
      phone: "809-555-0100",
      role: "JUGADOR",
      wallet: { create: { balance: 500 } },
    },
    include: { wallet: true },
  });

  if (demo.wallet && demo.wallet.balance < 500) {
    await prisma.wallet.update({
      where: { id: demo.wallet.id },
      data: { balance: 500 },
    });
  }

  const cajeroFields = {
    passwordHash: pwd,
    active: true,
    role: "CAJERO" as const,
  };

  await prisma.user.upsert({
    where: { username: "cajero" },
    update: { ...cajeroFields, fullName: "Cajero Principal" },
    create: {
      username: "cajero",
      fullName: "Cajero Principal",
      ...cajeroFields,
    },
  });

  await prisma.user.upsert({
    where: { username: "mostrador" },
    update: { ...cajeroFields, fullName: "Venta Mostrador" },
    create: {
      username: "mostrador",
      fullName: "Venta Mostrador",
      ...cajeroFields,
    },
  });

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: pwd,
      fullName: "Administrador",
      role: "ADMIN",
    },
  });

  const superPales = [
    {
      code: "SP_REAL_GANAMAS",
      name: "Súper Palé Real + Gana Más",
      lotteryA: "QREAL",
      lotteryB: "GANAMAS",
    },
    {
      code: "SP_NAC_LEIDSA",
      name: "Súper Palé Nacional + Leidsa",
      lotteryA: "NAC_NOCHE",
      lotteryB: "LEIDSA",
    },
  ];

  for (const sp of superPales) {
    const lotA = await prisma.lottery.findUnique({ where: { code: sp.lotteryA } });
    const lotB = await prisma.lottery.findUnique({ where: { code: sp.lotteryB } });
    if (!lotA || !lotB) continue;
    await prisma.superPaleConfig.upsert({
      where: { code: sp.code },
      update: { name: sp.name, lotteryAId: lotA.id, lotteryBId: lotB.id, active: true },
      create: {
        code: sp.code,
        name: sp.name,
        lotteryAId: lotA.id,
        lotteryBId: lotB.id,
        active: true,
      },
    });
  }

  await prisma.bancaSettings.upsert({
    where: { id: "default" },
    update: {
      bancaName: "ELITE 13",
      terminalCode: "bei-0013",
      defaultOpeningBalance: -174.3,
      expensiveDirectoAmount: 100,
      maxDirectoPerNumber: 2000,
      maxPalePerNumber: 2000,
      maxTripletaPerNumber: 2000,
      maxSuperPalePerNumber: 2000,
    },
    create: {
      id: "default",
      bancaName: "ELITE 13",
      terminalCode: "bei-0013",
      defaultOpeningBalance: -174.3,
      expensiveDirectoAmount: 100,
      maxDirectoPerNumber: 2000,
      maxPalePerNumber: 2000,
      maxTripletaPerNumber: 2000,
      maxSuperPalePerNumber: 2000,
    },
  });

  await prisma.rouletteSettings.upsert({
    where: { id: "default" },
    update: {
      houseEdge: 0.08,
      playerRtp: 0.92,
      maxBetAmount: 5,
      maxStraightBet: 5,
      maxOutsideBet: 5,
      maxPayoutPerSpin: 180,
      maxExposurePerNumber: 180,
      maxExposurePerSpin: 180,
      dailyProfitPercent: 3,
      dailyMinProfitPct: 1,
      dailyMaxProfitPct: 8,
      dailyTargetProfitPct: 3,
      autoAdjustmentEnabled: true,
      adjustmentType: "BALANCE_CREDIT",
      houseAlwaysWins: false,
      dailyOpenTime: "06:00",
      dailyCloseTime: "23:45",
      payoutMultipliers: serializePayoutMultipliers(
        DEFAULT_ROULETTE_SETTINGS.payoutMultipliers
      ),
    },
    create: {
      id: "default",
      active: true,
      minBetAmount: 1,
      maxBetAmount: 5,
      maxStraightBet: 5,
      maxOutsideBet: 5,
      maxPayoutPerSpin: 180,
      maxDailyPayoutPerPlayer: 0,
      maxExposurePerNumber: 180,
      maxExposurePerSpin: 180,
      houseReserve: 400,
      maxRiskPercentOfReserve: 15,
      houseEdge: 0.08,
      playerRtp: 0.92,
      payoutMultipliers: serializePayoutMultipliers(
        DEFAULT_ROULETTE_SETTINGS.payoutMultipliers
      ),
      positiveSpinMessage:
        "¡Buena suerte! Cada giro es justo y aleatorio — ¡tú puedes ganar!",
    },
  });

  const ticketCount = await prisma.ticket.count();
  await prisma.ticketSequence.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", value: ticketCount },
  });

  await prisma.slotSettings.upsert({
    where: { id: "default" },
    update: { active: true, minBetAmount: 1, maxBetAmount: 10 },
    create: { id: "default", active: true, minBetAmount: 1, maxBetAmount: 10 },
  });

  console.log(
    "Seed OK — demo / 1234 — cajero / 1234 — mostrador / 1234 — admin / 1234"
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
