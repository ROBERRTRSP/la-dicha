import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import dotenv from "dotenv";

const env = {
  ...dotenv.parse(fs.existsSync(".env") ? fs.readFileSync(".env") : ""),
  ...dotenv.parse(fs.existsSync(".env.local") ? fs.readFileSync(".env.local") : ""),
};

for (const [k, v] of Object.entries(env)) {
  if (v !== undefined) process.env[k] = v;
}

function describeUrl(name, url) {
  if (!url) {
    console.log(`${name}: (not set)`);
    return;
  }
  try {
    const u = new URL(url);
    console.log(`${name}:`);
    console.log(`  host: ${u.hostname}`);
    console.log(`  database: ${u.pathname.replace("/", "")}`);
    console.log(`  neon: ${u.hostname.includes("neon")}`);
    console.log(`  local: ${u.hostname === "localhost" || u.hostname === "127.0.0.1"}`);
  } catch {
    console.log(`${name}: invalid URL`);
  }
}

console.log("=== Effective env (Next.js: .env.local overrides .env) ===");
describeUrl("DATABASE_URL", env.DATABASE_URL);
describeUrl("DATABASE_URL_UNPOOLED", env.DATABASE_URL_UNPOOLED);
console.log(`AUTH_SECRET set: ${Boolean(env.AUTH_SECRET)}`);
console.log(`AUTH_SECRET length: ${env.AUTH_SECRET?.length ?? 0}`);

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'RouletteSpinIdempotency'
    ) AS table_exists;
  `;
  const exists = Boolean(rows?.[0]?.table_exists);
  console.log("\n=== RouletteSpinIdempotency ===");
  console.log(`TABLE_EXISTS: ${exists ? "YES" : "NO"}`);
  process.exitCode = exists ? 0 : 1;
} catch (e) {
  console.log("\n=== RouletteSpinIdempotency ===");
  console.log("ERROR:", e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
