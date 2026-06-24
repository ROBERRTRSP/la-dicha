"use client";

import Image from "next/image";
import { CASINO_ART } from "@/lib/casino-art";

const JACKPOTS = [
  { src: CASINO_ART.goldenOx.ui.jackpotMinor, label: "Menor" },
  { src: CASINO_ART.goldenOx.ui.jackpotMajor, label: "Mayor" },
  { src: CASINO_ART.goldenOx.ui.jackpotGrand, label: "Gran" },
] as const;

const MULTS = [
  CASINO_ART.goldenOx.ui.multX2,
  CASINO_ART.goldenOx.ui.multX5,
  CASINO_ART.goldenOx.ui.multX10,
] as const;

export function OxBonusLegend() {
  return (
    <div className="slot-ox-bonus-legend">
      <div className="slot-ox-bonus-group">
        <span className="slot-ox-bonus-heading">Premios acumulados</span>
        <div className="slot-ox-bonus-row">
          {JACKPOTS.map((jp) => (
            <figure key={jp.label} className="slot-ox-bonus-item">
              <Image
                src={jp.src}
                alt={`Premio ${jp.label}`}
                width={56}
                height={28}
                unoptimized
              />
            </figure>
          ))}
        </div>
      </div>
      <div className="slot-ox-bonus-group">
        <span className="slot-ox-bonus-heading">Multiplicadores</span>
        <div className="slot-ox-bonus-row">
          {MULTS.map((src) => (
            <figure key={src} className="slot-ox-bonus-item slot-ox-bonus-item--mult">
              <Image src={src} alt="" width={36} height={36} unoptimized />
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
