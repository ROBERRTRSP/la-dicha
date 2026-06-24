/** Símbolos premium · Magic Lamp — estilo casino móvil coherente */

export function LampSymbolPlate({
  uid,
  variant = "default",
}: {
  uid: string;
  variant?: "default" | "wild" | "scatter";
}) {
  const bg = `${uid}-lbg`;
  const rim = `${uid}-lrim`;
  const glow = `${uid}-lglow`;

  const rimColor =
    variant === "wild"
      ? "#f7c948"
      : variant === "scatter"
        ? "#e879f9"
        : "#818cf8";

  return (
    <>
      <defs>
        <radialGradient id={bg} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#312e81" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#1e1b4b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0f0a1e" stopOpacity="1" />
        </radialGradient>
        <linearGradient id={rim} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={rimColor} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${glow})`} />
      <path
        d="M50 8 L88 28 L88 72 L50 92 L12 72 L12 28 Z"
        fill={`url(#${bg})`}
        stroke={`url(#${rim})`}
        strokeWidth="2.5"
      />
      <ellipse cx="50" cy="80" rx="26" ry="5" fill="#000" opacity="0.35" />
      <ellipse cx="36" cy="26" rx="12" ry="7" fill="#fff" opacity="0.12" />
    </>
  );
}

export function LampSymbolIcon({
  symbolId,
  uid,
}: {
  symbolId: string;
  uid: string;
}) {
  switch (symbolId) {
    case "LAMP": {
      const goldId = `${uid}-gold-lamp`;
      return (
        <g>
          <defs>
            <linearGradient id={goldId} x1="30" y1="22" x2="70" y2="58">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <path d="M36 70h28v8H36z" fill="#475569" />
          <path d="M42 70V58h16v12" fill="#334155" />
          <path
            d="M30 58c0-18 10-32 20-36s20 18 20 36H30z"
            fill={`url(#${goldId})`}
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <ellipse cx="50" cy="36" rx="12" ry="7" fill="#fef9c3" opacity="0.95" />
          <path d="M44 28q6-10 12 0" stroke="#fde047" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="24" r="4" fill="#fde047" opacity="0.8" />
        </g>
      );
    }
    case "GENIE":
      return (
        <g>
          <path
            d="M50 72c-20-10-22-30-10-42 8-8 22-6 28 4s-2 28-18 38z"
            fill="#38bdf8"
            opacity="0.85"
          />
          <path d="M28 68c-6 8-2 14 6 12M72 68c6 8 2 14-6 12" stroke="#0ea5e9" strokeWidth="3" fill="none" />
          <circle cx="50" cy="34" r="11" fill="#0284c7" />
          <ellipse cx="50" cy="30" rx="9" ry="5" fill="#7dd3fc" />
          <path d="M44 38h12" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="46" cy="32" r="1.5" fill="#0c4a6e" />
          <circle cx="54" cy="32" r="1.5" fill="#0c4a6e" />
        </g>
      );
    case "RUBY":
      return (
        <g>
          <ellipse cx="50" cy="62" rx="20" ry="7" fill="#4c0519" />
          <path d="M50 26 L68 44 L50 72 L32 44 Z" fill="#e11d48" stroke="#881337" strokeWidth="2" />
          <path d="M50 26 L32 44h36z" fill="#fb7185" opacity="0.7" />
          <path d="M50 26 L68 44 L50 56z" fill="#be123c" opacity="0.5" />
          <ellipse cx="44" cy="40" rx="6" ry="4" fill="#fff" opacity="0.25" />
        </g>
      );
    case "CARPET":
      return (
        <g>
          <path
            d="M18 62c14-12 28-16 42-14s26 8 34 18l-8 10c-12-8-24-12-38-12s-22 4-30 8z"
            fill="#7c3aed"
            stroke="#6d28d9"
            strokeWidth="1.5"
          />
          <path d="M22 64c12-5 22-8 32-8s20 3 32 8" stroke="#fde047" strokeWidth="2" fill="none" />
          <circle cx="28" cy="58" r="3.5" fill="#fde047" />
          <circle cx="72" cy="58" r="3.5" fill="#fde047" />
          <circle cx="50" cy="54" r="3" fill="#fde047" opacity="0.8" />
        </g>
      );
    case "STAR":
      return (
        <g>
          <path
            d="M50 22l7 16h17l-14 10 5 17-15-11-15 11 5-17-14-10h17z"
            fill="#fde047"
            stroke="#f59e0b"
            strokeWidth="1.5"
          />
          <path
            d="M50 30l4 9h10l-8 6 3 10-9-7-9 7 3-10-8-6h10z"
            fill="#fff"
            opacity="0.35"
          />
        </g>
      );
    case "COINS":
      return (
        <g>
          <ellipse cx="40" cy="64" rx="17" ry="6" fill="#92400e" />
          <ellipse cx="40" cy="60" rx="17" ry="6" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5" />
          <ellipse cx="58" cy="54" rx="15" ry="5.5" fill="#92400e" />
          <ellipse cx="58" cy="50" rx="15" ry="5.5" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
          <ellipse cx="46" cy="42" rx="13" ry="5" fill="#92400e" />
          <ellipse cx="46" cy="38" rx="13" ry="5" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
          <text x="46" y="42" textAnchor="middle" fontSize="8" fontWeight="900" fill="#92400e" opacity="0.5">
            ★
          </text>
        </g>
      );
    default:
      return null;
  }
}

export function LampSymbolArt({
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
      <LampSymbolPlate uid={uid} variant={variant} />
      <LampSymbolIcon symbolId={symbolId} uid={uid} />
    </>
  );
}
