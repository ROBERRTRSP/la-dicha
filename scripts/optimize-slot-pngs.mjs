/**
 * Redimensiona, comprime y elimina fondos blancos de PNG de símbolos.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "assets", "slots");
const MAX = 384;

function stripWhiteBackground(data, channels) {
  const out = Buffer.from(data);
  const stride = channels;
  for (let i = 0; i < out.length; i += stride) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (r > 232 && g > 232 && b > 232) {
      if (stride === 4) out[i + 3] = 0;
    }
  }
  return out;
}

async function optimizeFile(filePath) {
  const before = fs.statSync(filePath).size;
  const tmp = `${filePath}.opt.png`;

  const pipeline = sharp(filePath)
    .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha();

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const cleaned = stripWhiteBackground(data, info.channels);

  await sharp(cleaned, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9, quality: 82, effort: 10 })
    .toFile(tmp);

  fs.renameSync(tmp, filePath);
  const after = fs.statSync(filePath).size;
  return { before, after };
}

async function main() {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".png")) files.push(full);
    }
  }
  walk(root);

  let totalBefore = 0;
  let totalAfter = 0;
  for (const file of files) {
    const { before, after } = await optimizeFile(file);
    totalBefore += before;
    totalAfter += after;
    console.log(
      `${path.relative(root, file)}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`
    );
  }
  console.log(
    `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
