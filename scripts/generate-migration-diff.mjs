import { execSync } from "node:child_process";
import fs from "node:fs";
import dotenv from "dotenv";

const env = {
  ...dotenv.parse(fs.existsSync(".env") ? fs.readFileSync(".env") : ""),
  ...dotenv.parse(fs.existsSync(".env.local") ? fs.readFileSync(".env.local") : ""),
};

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const out = execSync(
  "npx prisma migrate diff --from-url \"" +
    env.DATABASE_URL +
    "\" --to-schema-datamodel prisma/schema.prisma --script",
  { encoding: "utf8", env: { ...process.env, ...env } }
);

const dir = "prisma/migrations/20250608120000_add_roulette_spin_idempotency";
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/migration.sql`, out);
console.log(`Wrote ${dir}/migration.sql`);
console.log(out);
