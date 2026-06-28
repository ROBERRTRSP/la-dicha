/** Pip vectoriales para cartas A/K/Q/J — sin texto SVG. */
export function CardRankGlyph({
  rank,
  fill = "#fde047",
}: {
  rank: "A" | "K" | "Q" | "J";
  fill?: string;
}) {
  switch (rank) {
    case "A":
      return (
        <polygon
          points="50,34 60,56 50,66 40,56"
          fill={fill}
          stroke="#fef9c3"
          strokeWidth="1.5"
        />
      );
    case "K":
      return (
        <g stroke={fill} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M42 36v28M42 50h14M42 50l12-14M42 50l12 14" />
        </g>
      );
    case "Q":
      return (
        <g fill={fill}>
          <circle cx="50" cy="52" r="14" stroke="#fef9c3" strokeWidth="1.5" />
          <path d="M44 38h12l-2 8h-8z" opacity="0.9" />
        </g>
      );
    case "J":
      return (
        <path
          d="M58 36H46c0 10-2 16-8 20v8"
          fill="none"
          stroke={fill}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      );
  }
}

/** Insignia wild/scatter sin texto. */
export function SymbolBadgeGlyph({ kind }: { kind: "wild" | "scatter" }) {
  if (kind === "wild") {
    return (
      <path
        d="M50 76l4-8 8 2-2-8 6-6-8 2 2-8-8-2-2 8-8 2 8 2 2-8 6 6-2-8 8-2-4 8z"
        fill="#fde047"
        opacity="0.95"
      />
    );
  }
  return (
    <path
      d="M50 78c-8-6-6-16 0-22 6 6 8 16 0 22z"
      fill="#fb923c"
      opacity="0.95"
    />
  );
}

/** Siete vectorial sin texto. */
export function ClassicSevenGlyph({ strokeId }: { strokeId: string }) {
  return (
    <path
      d="M68 28H36c0 0 8 8 8 16s-4 14-12 18"
      fill="none"
      stroke={`url(#${strokeId})`}
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Barras horizontales (1/2/3) sin texto BAR. */
export function ClassicBarGlyphs({ count }: { count: 1 | 2 | 3 }) {
  const bars = Array.from({ length: count }, (_, i) => {
    const y = 46 + i * 10 - (count - 1) * 5;
    return (
      <rect
        key={i}
        x="22"
        y={y}
        width="56"
        height="7"
        rx="2"
        fill="#eef2ff"
        stroke="#c0c8d8"
        strokeWidth="1"
      />
    );
  });
  return <g>{bars}</g>;
}

/** Moneda decorativa sin caracteres. */
export function CoinInnerGlyph() {
  return (
    <g>
      <circle cx="50" cy="50" r="6" fill="#fde047" opacity="0.9" />
      <path
        d="M44 50h12M50 44v12"
        stroke="#991b1b"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Fallback genérico sin interrogación. */
export function SymbolUnknownGlyph() {
  return (
    <g opacity="0.7">
      <circle cx="50" cy="50" r="16" fill="none" stroke="#64748b" strokeWidth="2" />
      <circle cx="50" cy="50" r="4" fill="#94a3b8" />
    </g>
  );
}
