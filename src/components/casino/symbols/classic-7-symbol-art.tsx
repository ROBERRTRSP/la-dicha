"use client";

import {
  ClassicBarGlyphs,
  ClassicSevenGlyph,
  SymbolUnknownGlyph,
} from "./symbol-glyphs";

/** Arte vectorial premium para Classic 7 — sin emojis ni texto SVG. */
export function Classic7SymbolArt({
  symbolId,
  uid,
}: {
  symbolId: string;
  uid: string;
}) {
  const id = symbolId;

  if (id === "red-seven") {
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-7g`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="55%" stopColor="#c41e1e" />
            <stop offset="100%" stopColor="#7f0f0f" />
          </linearGradient>
          <linearGradient id={`${uid}-7g-stroke`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff8e7" />
            <stop offset="100%" stopColor="#ffd54f" />
          </linearGradient>
          <filter id={`${uid}-7s`}>
            <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.55" />
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffd54f" floodOpacity="0.35" />
          </filter>
        </defs>
        <rect
          x="8"
          y="14"
          width="84"
          height="72"
          rx="14"
          fill={`url(#${uid}-7g)`}
          stroke="#ffd54f"
          strokeWidth="3"
          filter={`url(#${uid}-7s)`}
        />
        <ClassicSevenGlyph strokeId={`${uid}-7g-stroke`} />
      </g>
    );
  }

  if (id === "single-bar" || id === "double-bar" || id === "triple-bar") {
    const count = id === "single-bar" ? 1 : id === "double-bar" ? 2 : 3;
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3a4558" />
            <stop offset="100%" stopColor="#121820" />
          </linearGradient>
        </defs>
        <rect x="6" y="22" width="88" height="56" rx="8" fill={`url(#${uid}-bg)`} stroke="#c0c8d8" strokeWidth="2.5" />
        <rect x="10" y="26" width="80" height="48" rx="6" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <ClassicBarGlyphs count={count as 1 | 2 | 3} />
      </g>
    );
  }

  if (id === "cherry") {
    return (
      <g>
        <defs>
          <radialGradient id={`${uid}-ch1`} cx="35%" cy="30%">
            <stop offset="0%" stopColor="#ff6b7a" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
          <radialGradient id={`${uid}-ch2`} cx="35%" cy="30%">
            <stop offset="0%" stopColor="#ff5c6c" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>
        </defs>
        <path d="M50 18 C46 8 58 6 62 14 C66 10 72 16 68 24 C72 28 66 34 58 32" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="38" cy="58" rx="18" ry="20" fill={`url(#${uid}-ch1)`} stroke="#7f1d1d" strokeWidth="1.5" />
        <ellipse cx="62" cy="58" rx="18" ry="20" fill={`url(#${uid}-ch2)`} stroke="#7f1d1d" strokeWidth="1.5" />
        <ellipse cx="34" cy="50" rx="5" ry="7" fill="rgba(255,255,255,0.35)" />
        <ellipse cx="58" cy="50" rx="5" ry="7" fill="rgba(255,255,255,0.28)" />
      </g>
    );
  }

  if (id === "golden-bell") {
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-bell`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe566" />
            <stop offset="45%" stopColor="#f5b800" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
        </defs>
        <path d="M50 16 L68 42 C78 48 82 58 80 68 L20 68 C18 58 22 48 32 42 Z" fill={`url(#${uid}-bell)`} stroke="#8b6914" strokeWidth="2" />
        <rect x="44" y="68" width="12" height="8" rx="2" fill="#c9a020" />
        <circle cx="50" cy="78" r="6" fill="#e8c05a" stroke="#8b6914" strokeWidth="1.5" />
        <ellipse cx="50" cy="38" rx="14" ry="8" fill="rgba(255,255,255,0.35)" />
      </g>
    );
  }

  if (id === "diamond") {
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-dm`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>
        <polygon points="50,14 78,42 50,86 22,42" fill={`url(#${uid}-dm)`} stroke="#7dd3fc" strokeWidth="2" />
        <polygon points="50,14 78,42 50,50 22,42" fill="rgba(255,255,255,0.22)" />
        <line x1="22" y1="42" x2="78" y2="42" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      </g>
    );
  }

  if (id === "horseshoe") {
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-hs`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe082" />
            <stop offset="100%" stopColor="#c9a020" />
          </linearGradient>
        </defs>
        <path d="M28 72 C18 58 18 38 28 28 C38 18 62 18 72 28 C82 38 82 58 72 72 L68 68 C76 56 76 40 68 32 C58 22 42 22 32 32 C24 40 24 56 32 68 Z" fill={`url(#${uid}-hs)`} stroke="#8b6914" strokeWidth="2.5" />
        <circle cx="28" cy="72" r="4" fill="#f5d76e" stroke="#8b6914" strokeWidth="1" />
        <circle cx="72" cy="72" r="4" fill="#f5d76e" stroke="#8b6914" strokeWidth="1" />
      </g>
    );
  }

  return (
    <g>
      <rect x="12" y="20" width="76" height="60" rx="10" fill="#1a2030" stroke="#64748b" strokeWidth="2" />
      <SymbolUnknownGlyph />
    </g>
  );
}
