import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CDN = "https://cdn-lottery.kiskoo.com/loterias-dominicanas";

/** Mismos logos que usa loteriasdominicanas.com */
const LOGOS = {
  LP_DIA: `${CDN}/la-primera-dia.png`,
  LP_NOCHE: `${CDN}/la-primera-noche.png`,
  LOTEDOM: `${CDN}/d46144f7e1f664fee5ba811f984c246e.png`,
  LS_DIA: `${CDN}/la-suerte-dia.png`,
  LS_TARDE: `${CDN}/la-suerte-noche.png`,
  QREAL: `${CDN}/loteria-real.png`,
  GANAMAS: `${CDN}/gana-mas.png`,
  NAC_TARDE: `${CDN}/7827e5ee87f05e864aa79f64210269c5.png`,
  NAC_NOCHE: `${CDN}/7827e5ee87f05e864aa79f64210269c5.png`,
  LOTEKA: `${CDN}/quiniela-loteka.png`,
  LEIDSA: `${CDN}/quiniela-leidsa.png`,
  NY_AM: `${CDN}/new-york-tarde.png`,
  NY_PM: `${CDN}/new-york-noche.png`,
  FL_AM: `${CDN}/florida-dia.png`,
  FL_PM: `${CDN}/florida-noche.png`,
  ANG_10: `${CDN}/anguila-manana-10am.png`,
  ANG_1: `${CDN}/anguila-medio-dia-1pm.png`,
  ANG_6: `${CDN}/anguila-tarde-6pm.png`,
  ANG_9: `${CDN}/anguila-noche-9pm.png`,
  KING_AM: `${CDN}/quiniela-king-lottery-dia.png`,
  KING_PM: `${CDN}/quiniela-king-lottery-noche.png`,
};

const dir = join(process.cwd(), "public", "logos");
mkdirSync(dir, { recursive: true });

let ok = 0;
let fail = 0;

for (const [code, url] of Object.entries(LOGOS)) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(dir, `${code}.png`), buf);
    console.log(`✓ ${code}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${code}: ${e.message}`);
    fail++;
  }
}

console.log(`\nDescargados: ${ok} | Fallidos: ${fail}`);
