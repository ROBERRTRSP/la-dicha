"use client";

export function SlotOrientationNotice({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="slot-orientation-notice" role="status" aria-live="polite">
      <div className="slot-orientation-notice-card">
        <p className="slot-orientation-notice-title">Modo vertical recomendado</p>
        <p className="slot-orientation-notice-copy">
          Gira tu telefono a vertical para jugar mejor.
        </p>
      </div>
    </div>
  );
}
