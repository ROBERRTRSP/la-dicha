import { execSync } from "node:child_process";
import fs from "node:fs";
import dotenv from "dotenv";

const env = {
  ...dotenv.parse(fs.existsSync(".env") ? fs.readFileSync(".env") : ""),
  ...dotenv.parse(fs.existsSync(".env.local") ? fs.readFileSync(".env.local") : ""),
};

const cmd = process.argv.slice(2).join(" ");
if (!cmd) {
  console.error("Usage: node scripts/run-prisma.mjs <prisma command>");
  process.exit(1);
}

execSync(`npx ${cmd}`, {
  stdio: "inherit",
  env: { ...process.env, ...env },
});
