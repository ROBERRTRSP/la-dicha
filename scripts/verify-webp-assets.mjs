#!/usr/bin/env node
/** Verifica que cada ruta rasterAsset() tenga .webp en public/. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

const paths = new Set();

function collectFromFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const re = /rasterAsset\(\s*["']([^"']+)["']\s*\)/g;
  let m;
  while ((m = re.exec(text))) paths.add(m[1].replace(/\.(png|jpe?g)$/i, ".webp"));
  const re2 = /["'](\/[^"']+\.(png|jpe?g))["']/gi;
  while ((m = re2.exec(text))) {
    if (file.includes("symbol-assets")) paths.add(m[1].replace(/\.(png|jpe?g)$/i, ".webp"));
  }
}

for (const dir of ["src/lib", "src/components"]) {
  const full = path.join(root, dir);
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) collectFromFile(p);
    }
  }
  walk(full);
}

let missing = 0;
let ok = 0;
for (const webp of [...paths].sort()) {
  const disk = path.join(publicDir, webp.slice(1));
  if (!fs.existsSync(disk)) {
    console.log("MISSING", webp);
    missing++;
  } else ok++;
}

console.log(`\n=== WebP check: ${ok} OK, ${missing} missing ===\n`);
process.exit(missing ? 1 : 0);
