"use client";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  homeHref: string;
  homeLabel: string;
};

export function RouteError({
  error,
  reset,
  title = "No pudimos cargar esta pantalla",
  homeHref,
  homeLabel,
}: RouteErrorProps) {
  return (
    <div className="route-state route-state--error" role="alert">
      <h2 className="route-state__title">{title}</h2>
      <p className="route-state__message">
        Ocurrió un error inesperado. Puedes reintentar o volver al inicio del
        portal.
      </p>
      {process.env.NODE_ENV === "development" && error.message ? (
        <p className="route-state__debug">{error.message}</p>
      ) : null}
      <div className="route-state__actions">
        <button type="button" className="route-state__btn route-state__btn--primary" onClick={reset}>
          Reintentar
        </button>
        <button
          type="button"
          className="route-state__btn route-state__btn--secondary"
          onClick={() => window.history.back()}
        >
          Volver atrás
        </button>
        <a className="route-state__btn route-state__btn--ghost" href={homeHref}>
          {homeLabel}
        </a>
      </div>
    </div>
  );
}
