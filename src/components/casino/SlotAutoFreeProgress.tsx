"use client";

import type { AutoFreeSpinProgress } from "@/lib/slots/auto-free-spin";
import { cn } from "@/lib/utils";

export function SlotAutoFreeProgress({
  progress,
  freeMode,
  pulse,
  className,
}: {
  progress: AutoFreeSpinProgress | null;
  freeMode?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  if (freeMode || !progress) return null;

  const filled =
    progress.current === 0 && progress.paidTotal > 0
      ? progress.target
      : progress.current;

  return (
    <div
      className={cn("slot-auto-free-progress", pulse && "slot-auto-free-progress--pulse", className)}
      aria-label={`Progreso hacia giro gratis: ${filled} de ${progress.target}`}
    >
      <div className="slot-auto-free-progress-head">
        <span className="slot-auto-free-progress-label">Giro gratis</span>
        <span className="slot-auto-free-progress-count">
          {filled}/{progress.target}
        </span>
      </div>
      <div className="slot-auto-free-progress-track">
        {Array.from({ length: progress.target }, (_, i) => (
          <span
            key={i}
            className={cn(
              "slot-auto-free-progress-dot",
              i < filled && "slot-auto-free-progress-dot--filled"
            )}
          />
        ))}
      </div>
      <p className="slot-auto-free-progress-hint">
        {progress.remaining === 0
          ? "¡Ciclo completo!"
          : progress.remaining === 1
            ? "¡1 giro más!"
            : `${progress.remaining} giros pagados restantes`}
      </p>
    </div>
  );
}
