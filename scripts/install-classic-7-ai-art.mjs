/**
 * Instala arte IA de Classic 7 desde /assets del workspace a /public.
 * Ejecutar tras regenerar imágenes: node scripts/install-classic-7-ai-art.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const aiDir = path.join(
  path.dirname(root),
  ".cursor",
  "projects",
  "c-Users-minim-WEB-PARA-VENTA-DE-LOTERIA-DOMINICANA",
  "assets"
);

const SYMBOL_MAP = {
  "classic-7-red-seven.png": "red-seven.png",
  "classic-7-triple-bar.png": "triple-bar.png",
  "classic-7-double-bar.png": "double-bar.png",
  "classic-7-single-bar.png": "single-bar.png",
  "classic-7-golden-bell.png": "golden-bell.png",
  "classic-7-diamond.png": "diamond.png",
  "classic-7-horseshoe.png": "horseshoe.png",
  "classic-7-cherry.png": "cherry.png",
};

const UI_MAP = {
  "classic-7-bg.png": "public/casino/classic-7-bg.png",
  "classic-7-logo.png": "public/assets/casino/slots/classic-7/logo.png",
  "classic-7-cabinet-frame.png":
    "public/assets/casino/slots/classic-7/cabinet-frame.png",
  "classic-7-thumb.png": "public/casino/thumb-classic-7.png",
  "classic-7-spin-btn.png": "public/assets/casino/slots/classic-7/ui/spin-btn.png",
  "classic-7-hud-panel.png": "public/assets/casino/slots/classic-7/ui/hud-panel.png",
  "classic-7-big-win.png": "public/assets/casino/slots/classic-7/ui/big-win.png",
};

async function optimizeSymbol(src, dest) {
  await sharp(src)
    .resize(384, 384, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 88, effort: 10 })
    .toFile(dest);
}

async function optimizeUi(src, dest, width) {
  const img = sharp(src);
  const meta = await img.metadata();
  const w = width ?? meta.width ?? 800;
  await img
    .resize(w, null, { fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9, quality: 86, effort: 10 })
    .toFile(dest);
}

async function main() {
  const symbolOut = path.join(root, "public", "assets", "slots", "classic-7");
  const uiOut = path.join(root, "public", "assets", "casino", "slots", "classic-7", "ui");
  fs.mkdirSync(symbolOut, { recursive: true });
  fs.mkdirSync(uiOut, { recursive: true });

  console.log("Classic 7 · instalando arte IA…\n");

  for (const [srcName, destName] of Object.entries(SYMBOL_MAP)) {
    const src = path.join(aiDir, srcName);
    const dest = path.join(symbolOut, destName);
    if (!fs.existsSync(src)) {
      console.warn(`  ⚠ omitido (no existe): ${srcName}`);
      continue;
    }
    await optimizeSymbol(src, dest);
    console.log(`  ✓ símbolo ${destName}`);
  }

  for (const [srcName, relDest] of Object.entries(UI_MAP)) {
    const src = path.join(aiDir, srcName);
    const dest = path.join(root, relDest);
    if (!fs.existsSync(src)) {
      console.warn(`  ⚠ omitido (no existe): ${srcName}`);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const width =
      srcName.includes("thumb") ? 800 :
      srcName.includes("bg") ? 900 :
      srcName.includes("logo") ? 960 :
      srcName.includes("cabinet") ? 840 :
      srcName.includes("spin") ? 512 :
      undefined;
    await optimizeUi(src, dest, width);
    console.log(`  ✓ UI ${relDest}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
