"use client";

import { WHEEL_ORDER, numberColor } from "@/lib/roulette";
import { DEG_PER_SEGMENT } from "@/lib/roulette-animation";
import { ART } from "@/lib/visual-assets";
import { cn } from "@/lib/utils";

const CX = 200;
const CY = 200;
const OUTER_R = 192;
const POCKET_OUTER = 168;
const POCKET_INNER = 118;
const HUB_R = 52;
const TRACK_R = 178;

const POCKET_FILL = {
  red: { base: "#b91c3c" },
  black: { base: "#1e293b" },
  green: { base: "#059669" },
} as const;

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function pocketPath(startDeg: number, endDeg: number) {
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const o1 = polar(startDeg, POCKET_OUTER);
  const o2 = polar(endDeg, POCKET_OUTER);
  const i2 = polar(endDeg, POCKET_INNER);
  const i1 = polar(startDeg, POCKET_INNER);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${POCKET_OUTER} ${POCKET_OUTER} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${POCKET_INNER} ${POCKET_INNER} 0 ${large} 0 ${i1.x} ${i1.y}`,
    "Z",
  ].join(" ");
}

export function RouletteWheelSvg({
  highlightIndex,
}: {
  highlightIndex: number | null;
}) {
  return (
    <svg
      viewBox="0 0 400 400"
      className="rw-svg-wheel"
      aria-hidden
    >
      <defs>
        <radialGradient id="rw-hub-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <linearGradient id="rw-rim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <filter id="rw-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.45" />
        </filter>
        <clipPath id="rw-hub-logo-clip">
          <circle cx={CX} cy={CY} r={HUB_R - 12} />
        </clipPath>
      </defs>

      <circle
        cx={CX}
        cy={CY}
        r={OUTER_R}
        fill="url(#rw-rim-grad)"
        filter="url(#rw-shadow)"
      />
      <circle cx={CX} cy={CY} r={POCKET_OUTER + 6} fill="#0b1220" opacity="0.35" />

      {WHEEL_ORDER.map((num, i) => {
        const start = i * DEG_PER_SEGMENT;
        const end = (i + 1) * DEG_PER_SEGMENT;
        const color = numberColor(num);
        const fill = POCKET_FILL[color];
        const mid = start + DEG_PER_SEGMENT / 2;
        const label = polar(mid, (POCKET_OUTER + POCKET_INNER) / 2);
        const highlighted = highlightIndex === i;

        return (
          <g key={`${num}-${i}`}>
            <path
              d={pocketPath(start, end)}
              fill={fill.base}
              stroke={highlighted ? "#fde68a" : "#1e293b"}
              strokeWidth={highlighted ? 2.5 : 0.6}
              className={cn(highlighted && "rw-pocket--win")}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn("rw-pocket-num", highlighted && "rw-pocket-num--win")}
              transform={`rotate(${mid}, ${label.x}, ${label.y})`}
            >
              {num}
            </text>
          </g>
        );
      })}

      {/* Hub elegante — sin centro vacío */}
      <circle cx={CX} cy={CY} r={HUB_R + 8} fill="#1e293b" stroke="#c9a227" strokeWidth="2" />
      <circle cx={CX} cy={CY} r={HUB_R} fill="url(#rw-hub-grad)" />
      <circle cx={CX} cy={CY} r={HUB_R - 10} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = i * 45;
        const p1 = polar(a, 14);
        const p2 = polar(a, HUB_R - 14);
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="rgba(120,53,15,0.35)"
            strokeWidth="1"
          />
        );
      })}
      <circle cx={CX} cy={CY} r={HUB_R - 12} fill="#fff" opacity="0.96" />
      <image
        href={ART.logo}
        x={CX - (HUB_R - 12)}
        y={CY - (HUB_R - 12)}
        width={(HUB_R - 12) * 2}
        height={(HUB_R - 12) * 2}
        clipPath="url(#rw-hub-logo-clip)"
        preserveAspectRatio="xMidYMid meet"
        className="rw-hub-logo"
      />
    </svg>
  );
}

/** Marco fijo: pista de bola + puntero */
export function RouletteFrameSvg() {
  return (
    <svg viewBox="0 0 400 400" className="rw-svg-frame" aria-hidden>
      <defs>
        <linearGradient id="rw-track-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="rw-ball-grad" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d4d4d8" />
          <stop offset="100%" stopColor="#52525b" />
        </radialGradient>
      </defs>

      {/* Pista de la bola */}
      <circle
        cx={CX}
        cy={CY}
        r={TRACK_R}
        fill="none"
        stroke="url(#rw-track-grad)"
        strokeWidth="11"
      />
      <circle
        cx={CX}
        cy={CY}
        r={TRACK_R}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="2"
      />

      {/* Puntero premium */}
      <path
        d={`M ${CX} 10 L ${CX + 14} 44 L ${CX} 38 L ${CX - 14} 44 Z`}
        fill="#fbbf24"
        stroke="#92400e"
        strokeWidth="1.5"
        className="rw-pointer"
      />
      <circle cx={CX} cy={36} r="5" fill="#fde68a" stroke="#b45309" strokeWidth="1" />
    </svg>
  );
}

export function RouletteBallSvg() {
  return (
    <svg viewBox="0 0 24 24" className="rw-ball-svg" aria-hidden>
      <defs>
        <radialGradient id="rw-ball-grad-inline" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d4d4d8" />
          <stop offset="100%" stopColor="#52525b" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#rw-ball-grad-inline)" />
      <circle cx="9" cy="8" r="3" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

export const BALL_TRACK_RADIUS_PCT = (TRACK_R / 400) * 100;
