/** Símbolos premium · Golden Ox — toro dorado, fuego, jackpots */

function OxDefs({ uid }: { uid: string }) {
  const p = `${uid}-ox`;
  return (
    <defs>
      <radialGradient id={`${p}-bg`} cx="38%" cy="32%" r="72%">
        <stop offset="0%" stopColor="#7c2d12" />
        <stop offset="45%" stopColor="#451a03" />
        <stop offset="100%" stopColor="#1c0a00" />
      </radialGradient>
      <linearGradient id={`${p}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef9c3" />
        <stop offset="35%" stopColor="#fde047" />
        <stop offset="70%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id={`${p}-gold-dark`} x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#92400e" />
        <stop offset="100%" stopColor="#fde047" />
      </linearGradient>
      <linearGradient id={`${p}-red`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="50%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>
      <linearGradient id={`${p}-fire`} x1="50%" y1="100%" x2="50%" y2="0%">
        <stop offset="0%" stopColor="#ea580c" />
        <stop offset="45%" stopColor="#f97316" />
        <stop offset="75%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#fef9c3" />
      </linearGradient>
      <filter id={`${p}-glow-gold`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#fde047" floodOpacity="0.85" />
      </filter>
      <filter id={`${p}-glow-fire`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#f97316" floodOpacity="0.9" />
      </filter>
    </defs>
  );
}

export function OxSymbolPlate({
  uid,
  variant = "default",
}: {
  uid: string;
  variant?: "default" | "wild" | "scatter";
}) {
  const p = `${uid}-ox`;
  const rim =
    variant === "wild"
      ? "#fde047"
      : variant === "scatter"
        ? "#f97316"
        : "#d97706";
  const glow =
    variant === "wild"
      ? "rgba(253,224,71,0.45)"
      : variant === "scatter"
        ? "rgba(249,115,22,0.4)"
        : "rgba(217,119,6,0.25)";

  return (
    <>
      <OxDefs uid={uid} />
      <circle cx="50" cy="50" r="42" fill={glow} opacity="0.55" />
      <rect
        x="14"
        y="14"
        width="72"
        height="72"
        rx="14"
        fill={`url(#${p}-bg)`}
        stroke={rim}
        strokeWidth="2.8"
      />
      <rect
        x="16"
        y="16"
        width="68"
        height="68"
        rx="12"
        fill="none"
        stroke={rim}
        strokeWidth="1"
        opacity="0.35"
      />
      <path
        d="M16 50h68M50 16v68"
        stroke="#fde047"
        strokeWidth="0.6"
        opacity="0.12"
      />
      <ellipse cx="50" cy="80" rx="24" ry="4" fill="#000" opacity="0.35" />
      <ellipse cx="34" cy="28" rx="14" ry="8" fill="#fff" opacity="0.1" />
      {variant === "wild" && (
        <text
          x="50"
          y="82"
          textAnchor="middle"
          fontSize="6.5"
          fontWeight="900"
          fill="#fde047"
          letterSpacing="0.12em"
          fontFamily="system-ui,sans-serif"
        >
          COMODÍN
        </text>
      )}
      {variant === "scatter" && (
        <text
          x="50"
          y="82"
          textAnchor="middle"
          fontSize="6"
          fontWeight="900"
          fill="#fb923c"
          letterSpacing="0.08em"
          fontFamily="system-ui,sans-serif"
        >
          BONO
        </text>
      )}
    </>
  );
}

function LowCard({
  uid,
  letter,
}: {
  uid: string;
  letter: string;
}) {
  const p = `${uid}-ox`;
  return (
    <g>
      <rect
        x="28"
        y="30"
        width="44"
        height="44"
        rx="10"
        fill="#451a03"
        stroke={`url(#${p}-gold)`}
        strokeWidth="2.2"
      />
      <rect
        x="32"
        y="34"
        width="36"
        height="36"
        rx="8"
        fill="none"
        stroke="#fde047"
        strokeWidth="0.8"
        opacity="0.4"
      />
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontSize="26"
        fontWeight="900"
        fill={`url(#${p}-gold)`}
        fontFamily="Georgia,serif"
        filter={`url(#${p}-glow-gold)`}
      >
        {letter}
      </text>
    </g>
  );
}

export function OxSymbolIcon({
  symbolId,
  uid,
}: {
  symbolId: string;
  uid: string;
}) {
  const p = `${uid}-ox`;

  switch (symbolId) {
    case "OX":
      return (
        <g filter={`url(#${p}-glow-gold)`}>
          <ellipse cx="50" cy="58" rx="28" ry="18" fill="#92400e" />
          <path
            d="M50 42c-14 0-22 8-24 18 2 6 10 10 24 10s22-4 24-10c-2-10-10-18-24-18z"
            fill={`url(#${p}-gold-dark)`}
          />
          <ellipse cx="50" cy="48" rx="20" ry="16" fill={`url(#${p}-gold)`} />
          <path
            d="M26 36c-6-14 2-22 12-20M74 36c6-14-2-22-12-20"
            stroke="#fde047"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M22 34c-4-8 0-14 8-12M78 34c4-8 0-14-8-12"
            stroke="#b45309"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="42" cy="46" r="3.5" fill="#422006" />
          <circle cx="58" cy="46" r="3.5" fill="#422006" />
          <circle cx="43" cy="45" r="1.2" fill="#fef9c3" />
          <circle cx="59" cy="45" r="1.2" fill="#fef9c3" />
          <ellipse cx="50" cy="54" rx="8" ry="5" fill="#78350f" />
          <path
            d="M46 54c2 2 6 2 8 0"
            stroke="#451a03"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M38 62c4 4 20 4 24 0"
            stroke="#fde047"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
        </g>
      );

    case "INGOT":
      return (
        <g filter={`url(#${p}-glow-gold)`}>
          <ellipse cx="50" cy="66" rx="26" ry="7" fill="#422006" opacity="0.6" />
          <path
            d="M24 50 L50 34 L76 50 L50 66 Z"
            fill={`url(#${p}-gold-dark)`}
            stroke="#b45309"
            strokeWidth="2"
          />
          <path d="M24 50 L50 34 L76 50" fill={`url(#${p}-gold)`} />
          <path
            d="M28 52 L50 38 L72 52 L50 62 Z"
            fill="#fde047"
            opacity="0.35"
          />
          <path
            d="M32 54v10l18 10 18-10V54"
            fill="#eab308"
            stroke="#ca8a04"
            strokeWidth="1.8"
          />
          <path
            d="M32 54l18 10 18-10"
            stroke="#fef9c3"
            strokeWidth="1.2"
            fill="none"
            opacity="0.5"
          />
          <ellipse cx="42" cy="46" rx="8" ry="4" fill="#fff" opacity="0.22" />
        </g>
      );

    case "RED_COIN":
      return (
        <g>
          <ellipse cx="50" cy="66" rx="22" ry="6" fill="#450a0a" opacity="0.55" />
          <circle cx="50" cy="50" r="26" fill="#7f1d1d" />
          <circle
            cx="50"
            cy="50"
            r="24"
            fill={`url(#${p}-red)`}
            stroke="#fde047"
            strokeWidth="2.5"
          />
          <circle cx="50" cy="50" r="16" fill="#991b1b" stroke="#fca5a5" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="9" fill="#dc2626" stroke="#fde047" strokeWidth="1.2" />
          <text
            x="50"
            y="54"
            textAnchor="middle"
            fontSize="11"
            fontWeight="900"
            fill="#fde047"
            fontFamily="system-ui,sans-serif"
          >
            福
          </text>
          <ellipse cx="42" cy="42" rx="7" ry="4" fill="#fff" opacity="0.2" />
        </g>
      );

    case "FIRE":
      return (
        <g filter={`url(#${p}-glow-fire)`}>
          <path
            d="M50 74 C34 58 36 38 50 28 C56 38 58 48 54 54 C58 44 64 40 66 50 C72 42 74 58 50 74Z"
            fill={`url(#${p}-fire)`}
            stroke="#c2410c"
            strokeWidth="1.5"
          />
          <path
            d="M50 72 C42 62 44 48 50 40 C52 48 52 56 50 62 C54 54 58 52 58 58 C62 52 62 64 50 72Z"
            fill="#fef9c3"
            opacity="0.85"
          />
          <ellipse cx="50" cy="76" rx="12" ry="3" fill="#ea580c" opacity="0.5" />
        </g>
      );

    case "A":
      return <LowCard uid={uid} letter="A" />;
    case "K":
      return <LowCard uid={uid} letter="K" />;
    case "Q":
      return <LowCard uid={uid} letter="Q" />;
    case "J":
      return <LowCard uid={uid} letter="J" />;

    default:
      return null;
  }
}

export function OxSymbolArt({
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
      <OxSymbolPlate uid={uid} variant={variant} />
      <OxSymbolIcon symbolId={symbolId} uid={uid} />
    </>
  );
}
