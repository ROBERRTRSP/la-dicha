import { LotteryLogo } from "@/components/player/LotteryLogo";
import { formatTime12 } from "@/lib/utils";

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
  const withResults = draws.filter((d) => d.result);
  const waiting = showPending ? draws.filter((d) => !d.result) : [];

  if (draws.length === 0) return null;

  return (
    <section className="results-section">
      {!hideHeading && title && (
        <h2 className="results-day-heading">{title}</h2>
      )}

      {withResults.length > 0 && (
        <>
          <h3 className="results-section-title results-section-title--done">
            Ya salieron ({withResults.length})
          </h3>
          <ul className="results-list">
            {withResults.map((d) => (
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
                    <p className="results-card-time">
                      {formatTime12(d.drawTime)}
                    </p>
                  </div>
                  <span className="results-badge results-badge--done">
                    Confirmado
                  </span>
                </div>
                <div className="results-numbers">
                  {[
                    { label: "1ra", num: d.result!.first },
                    { label: "2da", num: d.result!.second },
                    { label: "3ra", num: d.result!.third },
                  ].map(({ label, num }) => (
                    <div key={label} className="results-num-box">
                      <p className="results-num-label">{label}</p>
                      <p className="results-num-value">{num}</p>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {waiting.length > 0 && (
        <>
          <h3 className="results-section-title">
            Pendientes ({waiting.length})
          </h3>
          <ul className="results-list results-list--compact">
            {waiting.map((d) => (
              <li key={d.id} className="results-row">
                <LotteryLogo
                  code={d.lottery.code}
                  name={d.lottery.name}
                  logoUrl={d.lottery.logoUrl}
                  size={28}
                  decorative
                />
                <div className="results-card-info">
                  <p className="results-card-name">{d.lottery.name}</p>
                  <p className="results-card-time">
                    {formatTime12(d.drawTime)}
                  </p>
                </div>
                <span className="results-badge results-badge--wait">
                  Esperando
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {withResults.length === 0 && waiting.length === 0 && (
        <p className="results-day-empty">Sin resultados confirmados.</p>
      )}
    </section>
  );
}
