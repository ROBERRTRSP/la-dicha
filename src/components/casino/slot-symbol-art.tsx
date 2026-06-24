/** Ilustraciones vectoriales para símbolos de tragamonedas (sin texto crudo). */
export function SlotSymbolArt({
  symbolId,
  uid,
  accent,
}: {
  symbolId: string;
  uid: string;
  accent: string;
}) {
  const bg = `${uid}-bg`;
  const shine = `${uid}-shine`;

  return (
    <>
      <defs>
        <radialGradient id={bg} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id={shine} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill={`url(#${bg})`} stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
      <ellipse cx="50" cy="78" rx="28" ry="6" fill="#000" opacity="0.25" />
      {renderIcon(symbolId, uid, accent)}
      <ellipse cx="34" cy="28" rx="14" ry="8" fill={`url(#${shine})`} opacity="0.7" />
    </>
  );
}

function renderIcon(symbolId: string, uid: string, accent: string) {
  switch (symbolId) {
    case "WILD_SKUNK":
      return (
        <g>
          <path
            d="M28 58c4-14 12-22 22-22s18 8 22 22c-6 8-14 12-22 12s-16-4-22-12z"
            fill="#1f2937"
          />
          <path d="M50 36c-8 0-14 6-14 14v4h28v-4c0-8-6-14-14-14z" fill="#f3f4f6" />
          <path d="M42 44h16v6H42z" fill="#111827" />
          <circle cx="44" cy="48" r="2" fill="#fef08a" />
          <circle cx="56" cy="48" r="2" fill="#fef08a" />
          <path d="M34 30l4 6 6-8M66 30l-4 6-6-8" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="24" r="5" fill="#fde047" opacity="0.9" />
          <circle cx="76" cy="26" r="4" fill="#fde047" opacity="0.85" />
          <circle cx="50" cy="18" r="3.5" fill="#fde047" />
        </g>
      );
    case "SKUNK":
      return (
        <g>
          <ellipse cx="50" cy="54" rx="22" ry="18" fill="#374151" />
          <ellipse cx="50" cy="42" rx="14" ry="12" fill="#f9fafb" />
          <circle cx="45" cy="40" r="2.5" fill="#111827" />
          <circle cx="55" cy="40" r="2.5" fill="#111827" />
          <path d="M48 46q2 3 4 0" stroke="#111827" strokeWidth="1.5" fill="none" />
          <path d="M36 58c-8 4-10 10-6 14" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "CHEST":
      return (
        <g>
          <rect x="26" y="44" width="48" height="26" rx="4" fill="#92400e" />
          <rect x="26" y="36" width="48" height="14" rx="4" fill="#b45309" />
          <rect x="26" y="48" width="48" height="4" fill="#fde047" />
          <rect x="44" y="46" width="12" height="10" rx="2" fill="#fde047" />
          <circle cx="50" cy="51" r="2" fill="#78350f" />
          <ellipse cx="38" cy="40" rx="6" ry="3" fill="#fcd34d" opacity="0.6" />
        </g>
      );
    case "GOLD_BAG":
      return (
        <g>
          <path d="M34 38c0-8 8-12 16-12s16 4 16 12v6H34v-6z" fill="#ca8a04" />
          <path d="M30 44h40c4 0 8 14 8 22H22c0-8 4-22 8-22z" fill="#eab308" />
          <path d="M42 30q8-6 16 0" stroke="#a16207" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="40" cy="58" r="5" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="52" cy="62" r="4" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="46" cy="68" r="3.5" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
        </g>
      );
    case "DIAMOND":
      return (
        <g>
          <path d="M50 22L68 42l-18 36L32 42z" fill="#38bdf8" stroke="#0ea5e9" strokeWidth="2" />
          <path d="M50 22L32 42h36z" fill="#7dd3fc" />
          <path d="M32 42l18 36 8-20z" fill="#0284c7" opacity="0.5" />
          <path d="M68 42l-18 36-8-20z" fill="#0369a1" opacity="0.35" />
        </g>
      );
    case "COINS":
      return (
        <g>
          <ellipse cx="42" cy="62" rx="16" ry="6" fill="#ca8a04" />
          <ellipse cx="42" cy="58" rx="16" ry="6" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5" />
          <ellipse cx="58" cy="54" rx="14" ry="5.5" fill="#ca8a04" />
          <ellipse cx="58" cy="50" rx="14" ry="5.5" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
          <ellipse cx="46" cy="44" rx="12" ry="5" fill="#ca8a04" />
          <ellipse cx="46" cy="40" rx="12" ry="5" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
        </g>
      );
    case "LEAF":
      return (
        <g>
          <path
            d="M50 24c-18 8-22 28-14 42 8-6 12-16 14-26 2 10 6 20 14 26 8-14 4-34-14-42z"
            fill="#22c55e"
            stroke="#15803d"
            strokeWidth="2"
          />
          <path d="M50 28v48" stroke="#14532d" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "LAMP":
      return (
        <g>
          <path d="M38 68h24v6H38z" fill="#64748b" />
          <path d="M44 68V58h12v10" fill="#475569" />
          <path d="M34 58c0-16 8-28 16-32s16 16 16 32H34z" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
          <ellipse cx="50" cy="38" rx="10" ry="6" fill="#fef3c7" opacity="0.8" />
          <path d="M46 30q4-8 8 0" stroke="#fde047" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "GENIE":
      return (
        <g>
          <path d="M50 68c-16-8-18-24-8-34s24-10 32 2-4 32-24 32z" fill="#38bdf8" opacity="0.85" />
          <circle cx="50" cy="36" r="10" fill="#0ea5e9" />
          <ellipse cx="50" cy="32" rx="8" ry="4" fill="#7dd3fc" />
          <path d="M42 38h16" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "RUBY":
      return (
        <g>
          <ellipse cx="50" cy="58" rx="18" ry="8" fill="#9f1239" />
          <circle cx="50" cy="48" r="14" fill="#e11d48" stroke="#881337" strokeWidth="2" />
          <circle cx="50" cy="48" r="8" fill="#fb7185" opacity="0.5" />
          <path d="M50 34v-6M50 62v4" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "CARPET":
      return (
        <g>
          <path d="M22 58c12-10 24-14 36-12s20 6 28 14l-6 8c-10-6-20-10-32-10s-20 2-26 6z" fill="#7c3aed" />
          <path d="M26 60c10-4 18-6 24-6s14 2 24 6" stroke="#fde047" strokeWidth="2" fill="none" />
          <circle cx="30" cy="54" r="3" fill="#fde047" />
          <circle cx="70" cy="54" r="3" fill="#fde047" />
        </g>
      );
    case "STAR":
      return (
        <g>
          <path
            d="M50 24l6 14h15l-12 9 5 15-14-10-14 10 5-15-12-9h15z"
            fill="#fde047"
            stroke="#f59e0b"
            strokeWidth="1.5"
          />
        </g>
      );
    case "OX":
      return (
        <g>
          <ellipse cx="50" cy="54" rx="24" ry="18" fill="#d97706" />
          <path d="M30 44c-6-8-2-16 6-14M70 44c6-8 2-16-6-14" stroke="#fde047" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="50" cy="46" rx="16" ry="14" fill="#fbbf24" />
          <circle cx="44" cy="44" r="2.5" fill="#422006" />
          <circle cx="56" cy="44" r="2.5" fill="#422006" />
          <path d="M46 52h8v4h-8z" fill="#92400e" />
        </g>
      );
    case "INGOT":
      return (
        <g>
          <path d="M28 48l22-12 22 12-22 12z" fill="#fde047" stroke="#ca8a04" strokeWidth="2" />
          <path d="M28 48v16l22 12 22-12V48" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
          <path d="M50 60v16" stroke="#ca8a04" strokeWidth="2" />
        </g>
      );
    case "RED_COIN":
      return (
        <g>
          <circle cx="50" cy="50" r="22" fill="#dc2626" stroke="#991b1b" strokeWidth="3" />
          <circle cx="50" cy="50" r="14" fill="#ef4444" stroke="#fde047" strokeWidth="2" />
          <circle cx="50" cy="50" r="6" fill="#fde047" />
        </g>
      );
    case "FIRE":
      return (
        <g>
          <path d="M50 70c-12-10-10-24 0-34 10 10 12 24 0 34z" fill="#f97316" />
          <path d="M50 70c-8-8-6-18 0-26 6 8 8 18 0 26z" fill="#fde047" />
          <path d="M38 68c-6-8-4-16 4-22 4 6 4 14-4 22z" fill="#ef4444" opacity="0.8" />
          <path d="M62 68c6-8 4-16-4-22-4 6-4 14 4 22z" fill="#ef4444" opacity="0.8" />
        </g>
      );
    case "WOLF":
      return (
        <g>
          <path d="M34 38l6 10 4-14M66 38l-6 10-4-14" fill="#64748b" />
          <ellipse cx="50" cy="52" rx="20" ry="16" fill="#94a3b8" />
          <ellipse cx="50" cy="48" rx="14" ry="12" fill="#e2e8f0" />
          <circle cx="44" cy="46" r="2.5" fill="#1e293b" />
          <circle cx="56" cy="46" r="2.5" fill="#1e293b" />
          <path d="M48 54l2 4 2-4" fill="#475569" />
        </g>
      );
    case "MOON":
      return (
        <g>
          <path
            d="M58 28c-14 2-22 14-20 28s16 22 30 20c-10-4-16-14-16-24s6-20 6-24z"
            fill="#fde047"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          <circle cx="62" cy="36" r="3" fill="#fef9c3" opacity="0.5" />
        </g>
      );
    case "MOUNTAIN":
      return (
        <g>
          <path d="M18 68L38 36l14 20 10-14 20 26H18z" fill="#64748b" stroke="#475569" strokeWidth="2" />
          <path d="M38 36l8 12 6-8 10 14" fill="#94a3b8" opacity="0.6" />
          <path d="M38 36l-4 8h8z" fill="#f8fafc" />
        </g>
      );
    case "CLAW":
      return (
        <g>
          <ellipse cx="50" cy="58" rx="16" ry="12" fill="#cbd5e1" />
          <circle cx="38" cy="44" r="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="50" cy="38" r="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="62" cy="44" r="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="44" cy="52" r="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        </g>
      );
    case "A":
    case "K":
    case "Q":
    case "J":
      return renderCardRank(symbolId, accent);
    default:
      return (
        <circle cx="50" cy="50" r="16" fill={accent} opacity="0.6" />
      );
  }
}

function renderCardRank(rank: string, accent: string) {
  const colors: Record<string, string> = {
    A: "#ef4444",
    K: "#3b82f6",
    Q: "#a855f7",
    J: "#22c55e",
  };
  const fill = colors[rank] ?? accent;
  return (
    <g>
      <rect x="30" y="30" width="40" height="40" rx="8" fill={fill} stroke="#fff" strokeWidth="2" opacity="0.95" />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontSize="26"
        fontWeight="900"
        fill="#fff"
        fontFamily="system-ui, sans-serif"
      >
        {rank}
      </text>
    </g>
  );
}

export const SLOT_THEME_ACCENT: Record<string, string> = {
  "treasure-skunk": "#84cc16",
  "magic-lamp": "#c084fc",
  "golden-ox": "#fbbf24",
  "moon-wolf": "#93c5fd",
};
