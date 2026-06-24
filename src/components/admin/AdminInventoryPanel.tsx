"use client";

import { formatMoney } from "@/lib/utils";
import type {
  AdminDrawInventory,
  AdminNumberSoldRow,
} from "@/lib/admin-lottery-sales";

function formatTime24(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function InventoryTable({ rows }: { rows: AdminNumberSoldRow[] }) {
  if (rows.length === 0) {
    return <p className="admin-empty">Sin jugadas.</p>;
  }
  return (
    <div className="admin-table-wrap admin-inventory-table-wrap">
      <table className="admin-table admin-table--compact">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Números</th>
            <th>Jugadas</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.betType}-${row.numbers}-${i}`}>
              <td>{row.betTypeLabel}</td>
              <td>
                <strong>{row.numbers}</strong>
              </td>
              <td>{row.plays}</td>
              <td>{formatMoney(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminInventoryPanel({
  drawInventories,
  globalInventory,
  totalItems,
  selectedDrawId,
  onSelectDraw,
}: {
  drawInventories: AdminDrawInventory[];
  globalInventory: AdminNumberSoldRow[];
  totalItems: number;
  selectedDrawId: string | null;
  onSelectDraw: (drawId: string | null) => void;
}) {
  const selected = drawInventories.find((d) => d.drawId === selectedDrawId);

  return (
    <section className="admin-inventory">
      <h2 className="admin-subtitle">Inventario del día</h2>
      <p className="admin-loterias-hint">
        Números vendidos y montos por sorteo. Toca un sorteo para ver su
        inventario detallado.
      </p>

      {drawInventories.length === 0 ? (
        <p className="admin-empty">Sin jugadas registradas este día.</p>
      ) : (
        <>
          <div className="admin-inventory-chips">
            <button
              type="button"
              className={`admin-inventory-chip${selectedDrawId === null ? " active" : ""}`}
              onClick={() => onSelectDraw(null)}
            >
              Consolidado ({totalItems} jug. · {globalInventory.length} tipos)
            </button>
            {drawInventories.map((inv) => (
              <button
                key={inv.drawId}
                type="button"
                className={`admin-inventory-chip${selectedDrawId === inv.drawId ? " active" : ""}`}
                onClick={() => onSelectDraw(inv.drawId)}
              >
                {inv.lotteryName} {formatTime24(inv.drawTime)} ·{" "}
                {formatMoney(inv.totalSales)}
              </button>
            ))}
          </div>

          {selectedDrawId === null ? (
            <InventoryTable rows={globalInventory} />
          ) : selected ? (
            <>
              <div className="admin-inventory-head">
                <h3 className="admin-inventory-title">
                  {selected.lotteryName} · {formatTime24(selected.drawTime)}
                </h3>
                <p className="admin-inventory-meta">
                  {selected.itemCount} jugada
                  {selected.itemCount !== 1 ? "s" : ""} ·{" "}
                  {formatMoney(selected.totalSales)}
                </p>
              </div>

              {selected.quinielaGrid.length > 0 && (
                <div className="admin-inventory-quiniela">
                  <p className="admin-inventory-quiniela-label">
                    Quiniela / directo
                  </p>
                  <div className="admin-inventory-grid">
                    {selected.quinielaGrid.map((cell) => (
                      <div
                        key={cell.number}
                        className="admin-inventory-cell"
                        title={`${cell.plays} jugada(s)`}
                      >
                        <span className="admin-inventory-cell-num">
                          {cell.number}
                        </span>
                        <span className="admin-inventory-cell-amt">
                          {formatMoney(cell.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <InventoryTable rows={selected.plays} />
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
