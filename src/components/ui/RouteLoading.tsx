type RouteLoadingProps = {
  label?: string;
  theme?: "player" | "staff";
};

export function RouteLoading({
  label = "Cargando…",
  theme = "player",
}: RouteLoadingProps) {
  return (
    <div
      className={`route-state route-state--loading route-state--${theme}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="route-state__spinner" aria-hidden="true" />
      <p className="route-state__label">{label}</p>
    </div>
  );
}
