/** Símbolos premium · Moon Wolf */
export function WolfSymbolPlate({
  uid,
  variant = "default",
}: {
  uid: string;
  variant?: "default" | "wild" | "scatter";
}) {
  const rim =
    variant === "wild" ? "#93c5fd" : variant === "scatter" ? "#fde047" : "#64748b";
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-wbg`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill={`url(#${uid}-wbg)`} stroke={rim} strokeWidth="2.5" />
      <ellipse cx="50" cy="82" rx="28" ry="5" fill="#000" opacity="0.35" />
    </>
  );
}

export function WolfSymbolIcon({ symbolId }: { symbolId: string }) {
  switch (symbolId) {
    case "WOLF":
      return (
        <g>
          <path d="M32 38l8 12 4-16M68 38l-8 12-4-16" fill="#64748b" />
          <ellipse cx="50" cy="54" rx="22" ry="18" fill="#94a3b8" />
          <ellipse cx="50" cy="48" rx="15" ry="13" fill="#e2e8f0" />
          <circle cx="44" cy="46" r="2.5" fill="#0f172a" />
          <circle cx="56" cy="46" r="2.5" fill="#0f172a" />
        </g>
      );
    case "MOON":
      return (
        <g>
          <path d="M58 26c-16 2-24 16-22 32s18 24 34 22c-12-4-18-16-18-28s6-22 6-26z" fill="#fde047" stroke="#fbbf24" strokeWidth="2" />
        </g>
      );
    case "MOUNTAIN":
      return (
        <g>
          <path d="M16 70L38 38l16 18 12-16 22 30H16z" fill="#475569" stroke="#334155" strokeWidth="2" />
          <path d="M38 38l-6 10h12z" fill="#f8fafc" />
        </g>
      );
    case "CLAW":
      return (
        <g>
          <ellipse cx="50" cy="58" rx="18" ry="13" fill="#cbd5e1" />
          {[38, 50, 62, 44].map((cx, i) => (
            <circle key={i} cx={cx} cy={42 + (i % 2) * 8} r="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          ))}
        </g>
      );
    case "STAR":
      return (
        <g>
          <path d="M50 24l6 14h15l-12 9 5 15-14-10-14 10 5-15-12-9h15z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        </g>
      );
    case "A":
    case "K":
    case "Q":
    case "J":
      return (
        <g>
          <rect x="32" y="32" width="36" height="36" rx="8" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="2" />
          <text x="50" y="58" textAnchor="middle" fontSize="22" fontWeight="900" fill="#e0f2fe" fontFamily="system-ui,sans-serif">{symbolId}</text>
        </g>
      );
    default:
      return null;
  }
}

export function WolfSymbolArt({
  symbolId,
  uid,
  isWild,
  isScatter,
}: {
  symbolId: string;
  uid: string;
  isWild?: boolean;
  isScatter?: boolean;
}) {
  const variant = isWild ? "wild" : isScatter ? "scatter" : "default";
  return (
    <>
      <WolfSymbolPlate uid={uid} variant={variant} />
      <WolfSymbolIcon symbolId={symbolId} />
    </>
  );
}
