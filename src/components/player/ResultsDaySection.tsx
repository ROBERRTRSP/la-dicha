import { LotteryLogo } from "@/components/player/LotteryLogo";
import { compareDrawTime, formatTime12 } from "@/lib/utils";

type DrawWithResult = {
  id: string;
  drawTime: string;
  lottery: {
    code: string;
    name: string;
    logoUrl: string | null;
  };
  result: {
    first: string;
    second: string;
    third: string;
  } | null;
};

export function ResultsDaySection({
  title,
  draws,
  showPending = true,
  hideHeading = false,
}: {
  title: string;
  draws: DrawWithResult[];
  showPending?: boolean;
  hideHeading?: boolean;
}) {
  if (draws.length === 0) return null;

  const visible = draws.filter((d) => showPending || d.result);
  const ordered = showPending
    ? [
        ...visible
          .filter((d) => d.result)
          .sort((a, b) => compareDrawTime(b.drawTime, a.drawTime)),
        ...visible
          .filter((d) => !d.result)
          .sort((a, b) => compareDrawTime(a.drawTime, b.drawTime)),
      ]
    : [...visible].sort((a, b) => compareDrawTime(b.drawTime, a.drawTime));

  const confirmed = ordered.filter((d) => d.result).length;

  if (ordered.length === 0) {
    return (
      <section className="results-section">
        {!hideHeading && title && <h2 className="results-day-heading">{title}</h2>}
        <p className="results-day-empty">Sin resultados confirmados.</p>
      </section>
    );
  }

  return (
    <section className="results-section">
      {!hideHeading && title && <h2 className="results-day-heading">{title}</h2>}

      <p className="results-order-hint">
        {showPending
          ? `${confirmed} de ${ordered.length} confirmados · último en salir arriba`
          : `${ordered.length} sorteos · último en salir arriba`}
      </p>

      <ul className="results-list results-list--timeline">
        {ordered.map((d) =>
          d.result ? (
            <li key={d.id} className="results-card results-card--done">
              <div className="results-card-head">
                <LotteryLogo
                  code={d.lottery.code}
                  name={d.lottery.name}
                  logoUrl={d.lottery.logoUrl}
                  size={32}
                  decorative
                />
                <div className="results-card-info">
                  <p className="results-card-name">{d.lottery.name}</p>
                  <p className="results-card-time">{formatTime12(d.drawTime)}</p>
                </div>
                <span className="results-badge results-badge--done">Confirmado</span>
              </div>
              <div className="results-numbers">
                {[
                  { label: "1ra", num: d.result.first },
                  { label: "2da", num: d.result.second },
                  { label: "3ra", num: d.result.third },
                ].map(({ label, num }) => (
                  <div key={label} className="results-num-box">
                    <p className="results-num-label">{label}</p>
                    <p className="results-num-value">{num}</p>
                  </div>
                ))}
              </div>
            </li>
          ) : (
            <li key={d.id} className="results-row results-row--timeline">
              <LotteryLogo
                code={d.lottery.code}
                name={d.lottery.name}
                logoUrl={d.lottery.logoUrl}
                size={28}
                decorative
              />
              <div className="results-card-info">
                <p className="results-card-name">{d.lottery.name}</p>
                <p className="results-card-time">{formatTime12(d.drawTime)}</p>
              </div>
              <span className="results-badge results-badge--wait">Esperando</span>
            </li>
          )
        )}
      </ul>
    </section>
  );
}
