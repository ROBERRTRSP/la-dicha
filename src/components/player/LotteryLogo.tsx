"use client";

import { useState } from "react";
import Image from "next/image";
import { getLotteryBrand } from "@/lib/lottery-brands";
import { AI_LOTTERY_LOGOS } from "@/lib/visual-assets";
import { cn } from "@/lib/utils";

function logoCandidates(code: string, logoUrl?: string | null) {
  return [
    AI_LOTTERY_LOGOS[code],
    logoUrl,
    `/logos/${code}.png`,
    `/logos/${code}.svg`,
  ].filter((s): s is string => Boolean(s));
}

export function LotteryLogo({
  code,
  name,
  logoUrl,
  size = 40,
  className,
  decorative,
}: {
  code: string;
  name?: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
  /** Si hay texto junto al logo, evita leer el nombre dos veces */
  decorative?: boolean;
}) {
  const candidates = logoCandidates(code, logoUrl);
  const [tryIndex, setTryIndex] = useState(0);
  const brand = getLotteryBrand(code, name);
  const src = candidates[tryIndex];

  if (!src || tryIndex >= candidates.length) {
    return (
      <div
        className={cn(
          "lottery-logo shrink-0 rounded-xl flex items-center justify-center font-bold",
          className
        )}
        style={{
          width: size,
          height: size,
          background: brand.bg,
          color: brand.text,
          fontSize: Math.max(9, size * 0.28),
        }}
        aria-label={name ?? code}
      >
        {brand.initials}
      </div>
    );
  }

  return (
    <div
      className={cn("lottery-logo shrink-0 overflow-hidden rounded-xl", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={decorative ? "" : (name ?? code)}
        width={size}
        height={size}
        className="w-full h-full object-contain bg-white p-0.5"
        onError={() => setTryIndex((i) => i + 1)}
      />
    </div>
  );
}
