/**
 * Genera PNG de símbolos Classic 7 desde SVG fuente + thumb del lobby.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const symbolsDir = path.join(root, "public", "assets", "slots", "classic-7", "symbols");
const outDir = path.join(root, "public", "assets", "slots", "classic-7");
const MAX = 384;

async function svgToPng(svgPath, pngPath) {
  await sharp(svgPath)
    .resize(MAX, MAX, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 90, effort: 10 })
    .toFile(pngPath);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const svgs = fs.readdirSync(symbolsDir).filter((f) => f.endsWith(".svg"));
  for (const file of svgs) {
    const base = file.replace(/\.svg$/, "");
    const svgPath = path.join(symbolsDir, file);
    const pngPath = path.join(outDir, `${base}.png`);
    await svgToPng(svgPath, pngPath);
    const kb = (fs.statSync(pngPath).size / 1024).toFixed(1);
    console.log(`  ${base}.png (${kb} KB)`);
  }

  const thumbSvg = path.join(root, "public", "casino", "thumb-classic-7.svg");
  const thumbPng = path.join(root, "public", "casino", "thumb-classic-7.png");
  await sharp(thumbSvg)
    .resize(800, 440, { fit: "cover" })
    .png({ compressionLevel: 9, quality: 88 })
    .toFile(thumbPng);
  console.log(`  thumb-classic-7.png (${(fs.statSync(thumbPng).size / 1024).toFixed(1)} KB)`);

  console.log(`\nDone: ${svgs.length} symbols + lobby thumb`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
