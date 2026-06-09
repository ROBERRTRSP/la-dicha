import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();
const TZ = "America/Santo_Domingo";

/** Horarios según loteriasdominicanas.com */
const LOTTERIES = [
  { code: "LP_DIA", name: "La Primera Día", time: "12:00", category: "DOMINICANA" },
  { code: "LOTEDOM", name: "Quiniela LoteDom", time: "12:00", category: "DOMINICANA" },
  { code: "LS_DIA", name: "La Suerte 12:30", time: "12:30", category: "DOMINICANA" },
  { code: "GANAMAS", name: "Gana Más", time: "12:30", category: "DOMINICANA" },
  { code: "QREAL", name: "Quiniela Real", time: "12:55", category: "DOMINICANA" },
  { code: "NAC_TARDE", name: "Lotería Nacional Tarde", time: "14:30", category: "DOMINICANA" },
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

function parseTime(time: string, base: Date) {
  const [h, m] = time.split(":").map(Number);
  return setMinutes(setHours(base, h), m);
}

async function main() {
  const activeCodes = new Set(LOTTERIES.map((l) => l.code));
  await prisma.lottery.updateMany({
    where: { code: { notIn: [...activeCodes] } },
    data: { active: false },
  });

  for (const lot of LOTTERIES) {
    const logoUrl = `/logos/${lot.code}.png`;
    await prisma.lottery.upsert({
      where: { code: lot.code },
      update: {
        name: lot.name,
        drawTime: lot.time,
        category: lot.category,
        logoUrl,
        active: true,
      },
      create: {
        code: lot.code,
        name: lot.name,
        logoUrl,
        drawTime: lot.time,
        category: lot.category,
        active: true,
        schedules: {
          create: {
            drawTime: lot.time,
            daysOfWeek: "0,1,2,3,4,5,6",
            closeMin: 15,
          },
        },
      },
    });
  }

  const now = toZonedTime(new Date(), TZ);
  const today = startOfDay(now);

  for (const lot of LOTTERIES) {
    const lottery = await prisma.lottery.findUnique({ where: { code: lot.code } });
    if (!lottery) continue;
    const drawAt = parseTime(lot.time, today);
    const closesAt = addMinutes(drawAt, -15);
    let status: "OPEN" | "CLOSING_SOON" | "CLOSED" = "OPEN";
    if (now >= drawAt) status = "CLOSED";
    else if (now >= addMinutes(closesAt, -10)) status = "CLOSING_SOON";
    else if (now >= closesAt) status = "CLOSED";

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

  await prisma.user.upsert({
    where: { username: "cajero" },
    update: {},
    create: {
      username: "cajero",
      passwordHash: pwd,
      fullName: "Cajero Principal",
      role: "CAJERO",
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

  await prisma.rouletteSettings.upsert({
    where: { id: "default" },
    update: { active: true },
    create: { id: "default", active: true },
  });

  const draws = await prisma.draw.findMany({
    where: { drawDate: today },
    take: 4,
    include: { lottery: true },
  });

  for (const draw of draws.slice(0, 3)) {
    const existing = await prisma.result.findUnique({ where: { drawId: draw.id } });
    if (!existing) {
      await prisma.result.create({
        data: {
          drawId: draw.id,
          first: String(Math.floor(Math.random() * 100)).padStart(2, "0"),
          second: String(Math.floor(Math.random() * 100)).padStart(2, "0"),
          third: String(Math.floor(Math.random() * 100)).padStart(2, "0"),
        },
      });
      await prisma.draw.update({
        where: { id: draw.id },
        data: { status: "RESULT_AVAILABLE" },
      });
    }
  }

  await prisma.rouletteSettings.upsert({
    where: { id: "default" },
    update: { active: true },
    create: {
      id: "default",
      active: true,
      minBetAmount: 1,
      maxBetAmount: 100,
      maxStraightBet: 5,
      maxOutsideBet: 50,
      maxPayoutPerSpin: 500,
      maxDailyPayoutPerPlayer: 15000,
      maxExposurePerNumber: 180,
      maxExposurePerSpin: 800,
      houseReserve: 10000,
      maxRiskPercentOfReserve: 15,
      positiveSpinMessage:
        "¡Buena suerte! Cada giro es justo y aleatorio — ¡tú puedes ganar!",
    },
  });

  console.log("Seed OK — demo / 1234 — admin / 1234 — saldo RD$500");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
