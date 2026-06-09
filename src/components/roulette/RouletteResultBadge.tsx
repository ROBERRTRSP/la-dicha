import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COLOR_LABEL = {
  red: "Rojo",
  black: "Negro",
  green: "Verde",
} as const;

export function RouletteResultBadge({
  number,
  color,
  won,
  payout,
  summary,
  className,
}: {
  number: number;
  color: "red" | "black" | "green";
  won: boolean;
  payout?: number;
  summary?: string;
  className?: string;
}) {
  let outcome = "No salió";
  if (won && payout !== undefined) {
    outcome = `Ganaste ${formatMoney(payout)}`;
  } else if (!won && payout !== undefined && payout > 0) {
    outcome = `Recuperaste ${formatMoney(payout)}`;
  }

  return (
    <div
      className={cn(
        "rw-result-badge",
        won ? "rw-result-badge--win" : "rw-result-badge--lose",
        className
      )}
    >
      <div className={cn("rw-result-num", `rw-result-num--${color}`)}>
        {number}
      </div>
      <div className="rw-result-meta">
        <p className="rw-result-color">{COLOR_LABEL[color]}</p>
        {summary && <p className="rw-result-summary">{summary}</p>}
        <p className="rw-result-outcome">{outcome}</p>
      </div>
    </div>
  );
}
