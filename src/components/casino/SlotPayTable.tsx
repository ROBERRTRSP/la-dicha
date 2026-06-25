"use client";

import { OxBonusLegend } from "./OxBonusLegend";
import { SlotSymbolSvg } from "./SlotSymbolSvg";
import { getSlotGame } from "@/lib/slots/games";
import type { SlotGameId } from "@/lib/slots/types";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SlotPayTable({
  gameId,
  bet,
  className,
}: {
  gameId: SlotGameId;
  bet: number;
  className?: string;
}) {
  const isOx = gameId === "golden-ox";

  return (
    <details
      className={cn(
        "casino-paytable-details",
        isOx && "casino-paytable-details--ox",
        className
      )}
    >
      <summary className="casino-paytable-toggle">Tabla de pagos rápida</summary>
      <SlotPayTableContent gameId={gameId} bet={bet} />
    </details>
  );
}

export function SlotPayTableContent({
  gameId,
  bet,
}: {
  gameId: SlotGameId;
  bet: number;
}) {
  const game = getSlotGame(gameId)!;
  const isOx = gameId === "golden-ox";

  return (
    <section className={cn("casino-paytable", isOx && "casino-paytable--ox")}>
      <h3 className="casino-paytable-title">
        Pagos por línea · apuesta {formatMoney(bet)} · {game.paylineCount} líneas
      </h3>
      <div className="casino-paytable-grid">
        {Object.values(game.symbols).map((sym) => (
          <div key={sym.id} className="casino-paytable-item">
            <SlotSymbolSvg symbolId={sym.id} gameId={gameId} size={36} />
            <div className="casino-paytable-info">
              <span className="casino-paytable-name">
                {sym.label}
                {sym.isWild && (
                  <em className="casino-tag casino-tag--wild">COMODÍN</em>
                )}
                {sym.isScatter && (
                  <em className="casino-tag casino-tag--scatter">BONO</em>
                )}
              </span>
              <span className="casino-paytable-pays">
                {[5, 4, 3]
                  .map((n) => sym.pays[n as 3 | 4 | 5])
                  .filter((v): v is number => typeof v === "number")
                  .map((mult) => {
                    const perLine =
                      Math.round((bet / game.paylineCount) * mult * 100) / 100;
                    return formatMoney(perLine);
                  })
                  .join(" · ")}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="casino-paytable-foot">{game.bonus.description}</p>
      {isOx && <OxBonusLegend />}
    </section>
  );
}
