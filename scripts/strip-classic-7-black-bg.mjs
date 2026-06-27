/**
 * Quita fondos negros/cercanos de PNG Classic 7 (símbolos + logo).
 * npm run assets:classic7-transparency
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = [
  path.join(root, "public", "assets", "slots", "classic-7"),
  path.join(root, "public", "assets", "casino", "slots", "classic-7", "logo.png"),
];

function stripNearBlack(data, channels, threshold = 34) {
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (r <= threshold && g <= threshold && b <= threshold) {
      if (channels === 4) out[i + 3] = 0;
    }
  }
  return out;
}

async function processPng(filePath) {
  const img = sharp(filePath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const cleaned = stripNearBlack(data, info.channels);
  const tmp = `${filePath}.tmp.png`;
  await sharp(cleaned, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9, quality: 90, effort: 10 })
    .toFile(tmp);
  fs.renameSync(tmp, filePath);
  console.log(`✓ ${path.relative(root, filePath)}`);
}

async function main() {
  const files = [];
  for (const target of TARGETS) {
    if (fs.statSync(target).isDirectory()) {
      for (const name of fs.readdirSync(target)) {
        if (name.endsWith(".png")) files.push(path.join(target, name));
      }
    } else if (target.endsWith(".png") && fs.existsSync(target)) {
      files.push(target);
    }
  }

  for (const file of files) {
    await processPng(file);
  }
  console.log(`\nProcessed ${files.length} PNG(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
