#!/usr/bin/env node
/**
 * Comprime PNG/JPEG pesados en public/ y genera hermanos .webp.
 * No elimina originales PNG (compatibilidad); WebP es la ruta preferida en código.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const MIN_BYTES = 32 * 1024;

/** @type {Array<{ test: RegExp; maxW: number; maxH: number }>} */
const RULES = [
  { test: /[/\\]assets[/\\]slots[/\\]/i, maxW: 384, maxH: 384, minBytes: 0 },
  { test: /[/\\]thumb-[^/\\]+\.png$/i, maxW: 400, maxH: 400, minBytes: 0 },
  { test: /[/\\]logo\.png$/i, maxW: 512, maxH: 512 },
  { test: /win-celebration-splash\.png$/i, maxW: 1400, maxH: 800 },
  { test: /[/\\]roulette[/\\]/i, maxW: 1024, maxH: 1024 },
  { test: /[/\\]art[/\\]/i, maxW: 1200, maxH: 1200 },
  { test: /[/\\]casino[/\\]/i, maxW: 1200, maxH: 1200 },
];

function ruleFor(file) {
  for (const r of RULES) {
    if (r.test.test(file)) return r;
  }
  return { maxW: 1200, maxH: 1200, minBytes: MIN_BYTES };
}

async function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(png|jpe?g)$/i.test(e.name)) out.push(full);
  }
  return out;
}

async function optimizeOne(filePath) {
  const before = fs.statSync(filePath).size;
  const rule = ruleFor(filePath);
  const minBytes = rule.minBytes ?? MIN_BYTES;
  if (before < minBytes) return null;
  const meta = await sharp(filePath).metadata();
  let pipe = sharp(filePath);
  if ((meta.width ?? 0) > rule.maxW || (meta.height ?? 0) > rule.maxH) {
    pipe = pipe.resize(rule.maxW, rule.maxH, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const ext = path.extname(filePath).toLowerCase();
  const tmp = `${filePath}.opt${ext}`;

  if (ext === ".png") {
    await pipe
      .png({ compressionLevel: 9, quality: 85, effort: 10, palette: false })
      .toFile(tmp);
  } else {
    await pipe.jpeg({ quality: 82, mozjpeg: true }).toFile(tmp);
  }
  fs.renameSync(tmp, filePath);

  const webpPath = filePath.replace(/\.(png|jpe?g)$/i, ".webp");
  await sharp(filePath).webp({ quality: 82, effort: 6 }).toFile(webpPath);

  const afterPng = fs.statSync(filePath).size;
  const afterWebp = fs.statSync(webpPath).size;
  const rel = path.relative(ROOT, filePath);
  const relWebp = path.relative(ROOT, webpPath);
  console.log(
    `${rel}: ${Math.round(before / 1024)}KB → PNG ${Math.round(afterPng / 1024)}KB · WebP ${Math.round(afterWebp / 1024)}KB`
  );
  return { rel, relWebp, before, afterPng, afterWebp };
}

const files = await walk(ROOT);
let totalBefore = 0;
let totalPng = 0;
let totalWebp = 0;
let count = 0;

for (const f of files) {
  const r = await optimizeOne(f);
  if (!r) continue;
  count += 1;
  totalBefore += r.before;
  totalPng += r.afterPng;
  totalWebp += r.afterWebp;
}

console.log(
  `\n=== ${count} archivos optimizados ===\nAntes: ${(totalBefore / 1024 / 1024).toFixed(1)} MB\nPNG: ${(totalPng / 1024 / 1024).toFixed(1)} MB\nWebP: ${(totalWebp / 1024 / 1024).toFixed(1)} MB\n`
);
