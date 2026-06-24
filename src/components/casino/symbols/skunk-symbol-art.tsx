/** Símbolos premium · Treasure Skunk */
export function SkunkSymbolPlate({
  uid,
  variant = "default",
}: {
  uid: string;
  variant?: "default" | "wild" | "scatter";
}) {
  const rim =
    variant === "wild" ? "#fde047" : variant === "scatter" ? "#ec4899" : "#84cc16";
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-skbg`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="100%" stopColor="#052e16" />
        </radialGradient>
      </defs>
      <rect x="10" y="10" width="80" height="80" rx="16" fill={`url(#${uid}-skbg)`} stroke={rim} strokeWidth="2.5" />
      <ellipse cx="50" cy="82" rx="28" ry="5" fill="#000" opacity="0.35" />
    </>
  );
}

export function SkunkSymbolIcon({ symbolId }: { symbolId: string }) {
  switch (symbolId) {
    case "WILD_SKUNK":
      return (
        <g>
          <path d="M28 58c4-14 12-22 22-22s18 8 22 22c-6 8-14 12-22 12s-16-4-22-12z" fill="#1f2937" />
          <path d="M50 36c-8 0-14 6-14 14v4h28v-4c0-8-6-14-14-14z" fill="#f3f4f6" />
          <circle cx="24" cy="24" r="5" fill="#fde047" />
          <circle cx="76" cy="26" r="4" fill="#fde047" />
        </g>
      );
    case "SKUNK":
      return (
        <g>
          <ellipse cx="50" cy="54" rx="22" ry="18" fill="#374151" />
          <ellipse cx="50" cy="42" rx="14" ry="12" fill="#f9fafb" />
          <circle cx="45" cy="40" r="2.5" fill="#111827" />
          <circle cx="55" cy="40" r="2.5" fill="#111827" />
        </g>
      );
    case "CHEST":
      return (
        <g>
          <rect x="26" y="44" width="48" height="26" rx="4" fill="#92400e" />
          <rect x="26" y="36" width="48" height="14" rx="4" fill="#b45309" />
          <rect x="44" y="46" width="12" height="10" rx="2" fill="#fde047" />
        </g>
      );
    case "GOLD_BAG":
      return (
        <g>
          <path d="M30 44h40c4 0 8 14 8 22H22c0-8 4-22 8-22z" fill="#eab308" />
          <circle cx="46" cy="58" r="5" fill="#fde047" />
        </g>
      );
    case "DIAMOND":
      return (
        <g>
          <path d="M50 22L68 42l-18 36L32 42z" fill="#38bdf8" stroke="#0ea5e9" strokeWidth="2" />
        </g>
      );
    case "COINS":
      return (
        <g>
          <ellipse cx="42" cy="58" rx="16" ry="6" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5" />
          <ellipse cx="58" cy="50" rx="14" ry="5.5" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
        </g>
      );
    case "LEAF":
      return (
        <g>
          <path d="M50 24c-18 8-22 28-14 42 8-6 12-16 14-26 2 10 6 20 14 26 8-14 4-34-14-42z" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
        </g>
      );
    default:
      return null;
  }
}

export function SkunkSymbolArt({
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
      <SkunkSymbolPlate uid={uid} variant={variant} />
      <SkunkSymbolIcon symbolId={symbolId} />
    </>
  );
}
