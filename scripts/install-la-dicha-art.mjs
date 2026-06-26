/**
 * Genera assets SVG premium La Dicha en public/art/
 * Ejecutar en vercel-build y localmente: npm run art:install
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const root = join(process.cwd(), "public", "art");
const rouletteDir = join(root, "roulette");

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function write(rel, svg) {
  const full = join(process.cwd(), "public", rel.replace(/^\//, ""));
  ensureDir(join(full, ".."));
  writeFileSync(full, svg.trim() + "\n", "utf8");
  console.log(`✓ ${rel}`);
}

const gold = "#e8c05a";
const navy = "#0f172a";
const red = "#dc2626";

write(
  "art/login-bg.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="${navy}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${gold}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${navy}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="1200" fill="url(#bg)"/>
  <rect width="800" height="1200" fill="url(#glow)"/>
  <circle cx="400" cy="280" r="120" fill="none" stroke="${gold}" stroke-width="3" opacity="0.35"/>
  <text x="400" y="290" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="800" fill="${gold}">La Dicha</text>
</svg>`
);

write(
  "art/jugar-banner.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="640" height="180" rx="20" fill="url(#b)"/>
  <text x="32" y="72" font-family="system-ui,sans-serif" font-size="36" font-weight="800" fill="#fff">Jugar lotería</text>
  <text x="32" y="112" font-family="system-ui,sans-serif" font-size="16" fill="#cbd5e1">Suerte clara · Jugada segura</text>
</svg>`
);

write(
  "art/roulette-banner.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180">
  <rect width="640" height="180" rx="20" fill="${navy}"/>
  <circle cx="520" cy="90" r="64" fill="${red}" stroke="${gold}" stroke-width="4"/>
  <text x="520" y="98" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="800" fill="#fff">36</text>
  <text x="32" y="72" font-family="system-ui,sans-serif" font-size="32" font-weight="800" fill="${gold}">Ruleta La Dicha</text>
  <text x="32" y="112" font-family="system-ui,sans-serif" font-size="15" fill="#94a3b8">Europea · 0–36</text>
</svg>`
);

write(
  "art/empty-tickets.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200">
  <rect x="40" y="30" width="160" height="120" rx="12" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 6"/>
  <text x="120" y="100" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#64748b">Sin tickets</text>
</svg>`
);

write(
  "art/empty-results.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200">
  <rect x="50" y="40" width="140" height="100" rx="10" fill="#f1f5f9" stroke="#cbd5e1"/>
  <line x1="70" y1="70" x2="170" y2="70" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
  <line x1="70" y1="90" x2="150" y2="90" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
  <line x1="70" y1="110" x2="130" y2="110" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
</svg>`
);

write(
  "art/btn-girar.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="88" fill="${red}" stroke="${gold}" stroke-width="6"/>
  <text x="100" y="112" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="900" fill="#fff">GIRAR</text>
</svg>`
);

write(
  "art/btn-confirmar.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 72">
  <rect width="280" height="72" rx="36" fill="#0d9488"/>
  <text x="140" y="46" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" font-weight="800" fill="#fff">CONFIRMAR</text>
</svg>`
);

write(
  "art/seal-watermark.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" opacity="0.12">
  <circle cx="60" cy="60" r="54" fill="none" stroke="${navy}" stroke-width="3"/>
  <text x="60" y="66" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="800" fill="${navy}">LA DICHA</text>
</svg>`
);

for (const [name, letter, color] of [
  ["nav-jugar", "J", "#0d9488"],
  ["nav-tickets", "T", "#1e3a5f"],
  ["nav-resultados", "R", "#c9a227"],
]) {
  write(
    `art/${name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="${color}"/>
    <text x="32" y="42" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="800" fill="#fff">${letter}</text>
  </svg>`
  );
}

ensureDir(rouletteDir);

write(
  "art/roulette/roulette-bg.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#0a1628"/>
  <radialGradient id="rg" cx="50%" cy="40%" r="70%">
    <stop offset="0%" stop-color="#14532d" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="#0a1628"/>
  </radialGradient>
  <rect width="800" height="600" fill="url(#rg)"/>
</svg>`
);

write(
  "art/roulette/header.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 80">
  <rect width="640" height="80" fill="${navy}"/>
  <text x="20" y="52" font-family="system-ui,sans-serif" font-size="28" font-weight="800" fill="${gold}">Ruleta La Dicha</text>
</svg>`
);

write(
  "art/roulette/roulette-wheel-disc.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <circle cx="200" cy="200" r="190" fill="#1a1a2e" stroke="${gold}" stroke-width="6"/>
  <circle cx="200" cy="200" r="160" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="4 4"/>
</svg>`
);

write(
  "art/roulette/roulette-wheel-frame.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420">
  <circle cx="210" cy="210" r="200" fill="none" stroke="${gold}" stroke-width="12"/>
  <circle cx="210" cy="210" r="185" fill="none" stroke="#78350f" stroke-width="4"/>
</svg>`
);

write(
  "art/roulette/roulette-table-felt.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
  <rect width="800" height="400" rx="24" fill="#14532d"/>
  <rect x="20" y="20" width="760" height="360" rx="16" fill="none" stroke="#166534" stroke-width="2"/>
</svg>`
);

write(
  "art/roulette/roulette-chip-stack.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="72" r="40" fill="${red}" stroke="${gold}" stroke-width="3"/>
  <circle cx="60" cy="58" r="40" fill="#b91c1c" stroke="${gold}" stroke-width="3"/>
  <circle cx="60" cy="44" r="40" fill="${red}" stroke="${gold}" stroke-width="3"/>
</svg>`
);

write(
  "art/roulette/roulette-empty-history.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">
  <rect width="200" height="120" rx="12" fill="#1e293b" stroke="#334155"/>
  <text x="100" y="68" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">Sin historial</text>
</svg>`
);

for (const [color, fill] of [
  ["roulette-ball-red", red],
  ["roulette-ball-black", "#111827"],
  ["roulette-ball-green", "#15803d"],
]) {
  write(
    `art/roulette/${color}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="${fill}" stroke="#fff" stroke-width="2"/>
      <ellipse cx="12" cy="11" rx="4" ry="3" fill="#fff" opacity="0.35"/>
    </svg>`
  );
}

console.log("\nAssets La Dicha instalados en public/art/");
