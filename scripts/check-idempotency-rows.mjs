import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import dotenv from "dotenv";

const env = {
  ...dotenv.parse(fs.readFileSync(".env")),
  ...dotenv.parse(fs.readFileSync(".env.local")),
};
for (const [k, v] of Object.entries(env)) process.env[k] = v;

const prisma = new PrismaClient();
const rows = await prisma.rouletteSpinIdempotency.findMany({
  orderBy: { createdAt: "desc" },
  take: 10,
});
console.log(`Total recent rows: ${rows.length}`);
for (const r of rows) {
  console.log({
    key: r.idempotencyKey.slice(0, 50),
    responseLen: r.responseJson.length,
    userId: r.userId.slice(0, 12),
    createdAt: r.createdAt.toISOString(),
  });
}
await prisma.$disconnect();
