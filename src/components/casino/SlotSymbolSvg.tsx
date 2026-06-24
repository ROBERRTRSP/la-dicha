import type { SlotGameId } from "@/lib/slots/types";
import { cn } from "@/lib/utils";

const THEME_GLOW: Record<SlotGameId, string> = {
  "treasure-skunk": "#84cc16",
  "magic-lamp": "#c084fc",
  "golden-ox": "#fbbf24",
  "moon-wolf": "#93c5fd",
};

export function SlotSymbolSvg({
  symbolId,
  gameId,
  className,
  size = 64,
}: {
  symbolId: string;
  gameId: SlotGameId;
  className?: string;
  size?: number;
}) {
  const glow = THEME_GLOW[gameId];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("slot-symbol-svg", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={`sym-bg-${symbolId}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor={glow} stopOpacity="0.15" />
        </radialGradient>
        <filter id={`sym-glow-${symbolId}`}>
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={glow} floodOpacity="0.6" />
        </filter>
      </defs>
      <rect width="100" height="100" rx="12" fill={`url(#sym-bg-${symbolId})`} />
      <g filter={`url(#sym-glow-${symbolId})`}>{renderSymbol(symbolId, glow)}</g>
    </svg>
  );
}

function renderSymbol(id: string, accent: string) {
  switch (id) {
    case "WILD_SKUNK":
      return (
        <>
          <ellipse cx="50" cy="58" rx="28" ry="22" fill="#1a1a1a" />
          <ellipse cx="50" cy="52" rx="22" ry="18" fill="#fff" />
          <path d="M30 45 Q50 20 70 45" stroke="#fff" strokeWidth="4" fill="none" />
          <circle cx="42" cy="48" r="3" fill="#111" />
          <circle cx="58" cy="48" r="3" fill="#111" />
          <text x="50" y="18" textAnchor="middle" fontSize="14" fill={accent} fontWeight="bold">
            WILD
          </text>
        </>
      );
    case "SKUNK":
      return (
        <>
          <ellipse cx="50" cy="58" rx="26" ry="20" fill="#222" />
          <ellipse cx="50" cy="54" rx="20" ry="16" fill="#f5f5f5" />
          <path d="M32 48 Q50 28 68 48" stroke="#f5f5f5" strokeWidth="5" fill="none" />
          <circle cx="43" cy="52" r="2.5" fill="#111" />
          <circle cx="57" cy="52" r="2.5" fill="#111" />
        </>
      );
    case "CHEST":
      return (
        <>
          <rect x="22" y="42" width="56" height="38" rx="4" fill="#92400e" />
          <rect x="22" y="32" width="56" height="18" rx="4" fill="#b45309" />
          <rect x="46" y="38" width="8" height="14" fill="#fbbf24" />
        </>
      );
    case "GOLD_BAG":
      return (
        <>
          <path d="M35 35 Q50 25 65 35 L68 70 Q50 82 32 70 Z" fill="#ca8a04" />
          <text x="50" y="58" textAnchor="middle" fontSize="18" fill="#fef9c3">
            $
          </text>
        </>
      );
    case "DIAMOND":
      return (
        <polygon
          points="50,22 72,48 50,78 28,48"
          fill="#67e8f9"
          stroke="#0891b2"
          strokeWidth="2"
        />
      );
    case "COINS":
      return (
        <>
          <circle cx="40" cy="52" r="16" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
          <circle cx="58" cy="48" r="14" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
        </>
      );
    case "LEAF":
      return (
        <path
          d="M50 25 C70 35 75 55 50 75 C25 55 30 35 50 25 Z"
          fill="#22c55e"
          stroke="#15803d"
          strokeWidth="2"
        />
      );
    case "LAMP":
      return (
        <>
          <path d="M38 68 L42 38 Q50 28 58 38 L62 68 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
          <path d="M50 20 Q55 30 50 34 Q45 30 50 20" fill="#c084fc" opacity="0.8" />
          <text x="50" y="18" textAnchor="middle" fontSize="10" fill={accent} fontWeight="bold">
            WILD
          </text>
        </>
      );
    case "GENIE":
      return (
        <>
          <path d="M50 78 Q30 60 35 40 Q50 20 65 40 Q70 60 50 78" fill="#06b6d4" opacity="0.7" />
          <circle cx="50" cy="38" r="14" fill="#0891b2" />
        </>
      );
    case "RUBY":
      return (
        <polygon points="50,28 65,48 50,72 35,48" fill="#e11d48" stroke="#9f1239" strokeWidth="2" />
      );
    case "CARPET":
      return (
        <>
          <rect x="20" y="45" width="60" height="28" rx="4" fill="#7c3aed" />
          <line x1="30" y1="55" x2="70" y2="55" stroke="#fde047" strokeWidth="2" />
        </>
      );
    case "STAR":
      return (
        <polygon
          points="50,22 58,42 80,42 62,54 68,74 50,62 32,74 38,54 20,42 42,42"
          fill="#fde047"
        />
      );
    case "OX":
      return (
        <>
          <ellipse cx="50" cy="55" rx="30" ry="24" fill="#eab308" />
          <path d="M28 45 L22 30 M72 45 L78 30" stroke="#ca8a04" strokeWidth="4" strokeLinecap="round" />
          <text x="50" y="18" textAnchor="middle" fontSize="10" fill={accent} fontWeight="bold">
            WILD
          </text>
        </>
      );
    case "INGOT":
      return (
        <path d="M25 55 L50 40 L75 55 L50 70 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
      );
    case "RED_COIN":
      return <circle cx="50" cy="52" r="22" fill="#dc2626" stroke="#991b1b" strokeWidth="3" />;
    case "FIRE":
      return (
        <path d="M50 78 Q35 60 40 45 Q50 55 50 35 Q50 55 60 45 Q65 60 50 78" fill="#f97316" />
      );
    case "WOLF":
      return (
        <>
          <ellipse cx="50" cy="58" rx="26" ry="20" fill="#64748b" />
          <polygon points="30,45 24,28 38,40" fill="#94a3b8" />
          <polygon points="70,45 76,28 62,40" fill="#94a3b8" />
          <circle cx="42" cy="54" r="3" fill="#fbbf24" />
          <circle cx="58" cy="54" r="3" fill="#fbbf24" />
          <text x="50" y="18" textAnchor="middle" fontSize="10" fill={accent} fontWeight="bold">
            WILD
          </text>
        </>
      );
    case "MOON":
      return (
        <>
          <circle cx="50" cy="50" r="24" fill="#fef08a" />
          <circle cx="58" cy="44" r="20" fill="#1e3a8a" />
        </>
      );
    case "MOUNTAIN":
      return <polygon points="50,28 78,72 22,72" fill="#64748b" />;
    case "CLAW":
      return (
        <>
          <path d="M50 75 L50 45" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 50 L35 35 M50 50 L50 28 M50 50 L65 35" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "A":
      return (
        <text x="50" y="68" textAnchor="middle" fontSize="48" fontWeight="bold" fill="#f8fafc">
          A
        </text>
      );
    case "K":
      return (
        <text x="50" y="68" textAnchor="middle" fontSize="48" fontWeight="bold" fill="#f8fafc">
          K
        </text>
      );
    case "Q":
      return (
        <text x="50" y="68" textAnchor="middle" fontSize="48" fontWeight="bold" fill="#f8fafc">
          Q
        </text>
      );
    case "J":
      return (
        <text x="50" y="68" textAnchor="middle" fontSize="48" fontWeight="bold" fill="#f8fafc">
          J
        </text>
      );
    default:
      return <circle cx="50" cy="50" r="20" fill="#94a3b8" />;
  }
}
