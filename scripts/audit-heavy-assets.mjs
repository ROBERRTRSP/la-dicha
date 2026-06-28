#!/usr/bin/env node
/** Lista assets raster pesados en public/ (prefiere .webp si existe). */
import { readdir, stat, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("public");
const MIN_BYTES = 48 * 1024;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (/\.(webp|png|jpe?g)$/i.test(e.name)) files.push(full);
  }
  return files;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const files = await walk(ROOT);
const byBase = new Map();
for (const f of files) {
  const base = f.replace(/\.(webp|png|jpe?g)$/i, "");
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push(f);
}

const heavy = [];
for (const [base, variants] of byBase) {
  const webp = variants.find((v) => v.endsWith(".webp"));
  const chosen = webp ?? variants[0];
  const st = await stat(chosen);
  if (st.size >= MIN_BYTES) {
    heavy.push({
      path: path.relative(ROOT, chosen),
      kb: Math.round(st.size / 1024),
      served: Boolean(webp),
    });
  }
}
heavy.sort((a, b) => b.kb - a.kb);
console.log(`\n=== Assets servidos ≥ ${MIN_BYTES / 1024}KB (${heavy.length}) ===\n`);
for (const h of heavy.slice(0, 25)) {
  const tag = h.served ? "webp" : "legacy";
  console.log(`${String(h.kb).padStart(5)} KB [${tag}]  ${h.path}`);
}
if (heavy.length > 25) console.log(`\n… y ${heavy.length - 25} más`);
const totalKb = heavy.reduce((s, h) => s + h.kb, 0);
console.log(`\nTotal listado: ${(totalKb / 1024).toFixed(1)} MB\n`);
