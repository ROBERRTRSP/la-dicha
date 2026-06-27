"use client";

export function SlotOrientationNotice({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      className="slot-rotate-overlay"
      role="alertdialog"
      aria-live="assertive"
      aria-label="Gira tu telefono a horizontal para jugar"
    >
      <div className="slot-rotate-card">
        <div className="slot-rotate-icon" aria-hidden>
          <span className="slot-rotate-phone" />
          <span className="slot-rotate-arrow" />
        </div>
        <p className="slot-rotate-title">Gira tu teléfono a horizontal</p>
        <p className="slot-rotate-copy">
          Esta máquina está diseñada para jugarse en modo horizontal. Rota tu
          dispositivo para vivir la experiencia completa.
        </p>
      </div>
    </div>
  );
}
