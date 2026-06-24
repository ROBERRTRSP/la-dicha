"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import type { OpenDrawView } from "@/lib/draws";
import { CAJERO_PHONE_DIRECTORY } from "@/lib/cajero-phone-directory";
import { RECEIPT_CONFIG } from "@/lib/receipt-config";
import { CajeroSalesReportModal } from "@/components/cajero/CajeroSalesReportModal";
import { todayMonitorDateInput } from "@/lib/cajero-monitor-date";

type MenuModal = "help" | "config" | "ventas" | "historicas" | "directorio" | null;

type SaleRow = {
  ticketNumber: string;
  totalAmount: number;
  customerName: string | null;
  createdAt: string;
};

type DashboardSales = {
  count: number;
  playsCount: number;
  total: number;
  recent: SaleRow[];
  history: SaleRow[];
};

type MenuAction =
  | MenuModal
  | "duplicate"
  | "jugadas"
  | "report"
  | "nav"
  | "logout";

const MENU_ITEMS: {
  id: string;
  label: string;
  action: MenuAction;
  href?: string;
}[] = [
  { id: "monitoreo", label: "Monitoreo", action: "nav", href: "/cajero/monitor" },
  {
    id: "pendientes",
    label: "Pendientes de pago",
    action: "nav",
    href: "/cajero/tickets?focus=pending",
  },
  { id: "historicas", label: "Ventas históricas", action: "historicas" },
  { id: "reporte", label: "Reporte de ventas", action: "report" },
  { id: "duplicar", label: "Duplicar", action: "duplicate" },
  { id: "jugadas", label: "Jugadas", action: "jugadas" },
  {
    id: "pagar",
    label: "Pagar",
    action: "nav",
    href: "/cajero/tickets?focus=pending",
  },
  { id: "ver-ventas", label: "Ver ventas", action: "ventas" },
  { id: "ayuda", label: "Ayuda", action: "help" },
  { id: "config", label: "Configuración", action: "config" },
  { id: "directorio", label: "Directorio telefónico", action: "directorio" },
];

const HELP_KEYS: { k: string; d: string }[] = [
  { k: "↑", d: "(Arriba) Limpiar campos de jugada y Monto." },
  { k: "L", d: "(Ele) Cancelar el ticket y limpiar la pantalla." },
  { k: "/", d: "(Slash) Siguiente lotería." },
  { k: "-", d: "Lotería anterior." },
  { k: "Enter", d: "Confirmar jugada o monto y agregar al ticket." },
  { k: "*", d: "(Asterisco) Imprimir el ticket." },
  { k: "c", d: "Duplicar ticket." },
  { k: "P", d: "Marcar ticket como pagado." },
];

const HELP_PLAY: { k: string; d: string; unsupported?: boolean }[] = [
  {
    k: "q",
    d: "Digitar la jugada seguida de q (Ej.: 123q) para generar todas las combinaciones del número (quiniela).",
  },
  {
    k: ".",
    d: "Sólo para Palé y Tripleta. Digitar la jugada seguida de un punto (Ej.: 1234.) para generar todas las combinaciones del número.",
  },
  {
    k: "d",
    d: "Sólo para Directo. Ingresar una jugada inicial de dos dígitos iguales seguidos de la letra d y luego dos dígitos iguales para la jugada final (Ej.: 33d66) para generar una secuencia de pares iguales desde la jugada inicial hasta la jugada final.",
  },
  {
    k: "-10",
    d: "Sólo para Cash 3. Ingresar una jugada de tres dígitos seguidos de -10 (Ej.: 123-10) para generar todas las combinaciones que contienen los últimos dos dígitos aumentando en 100 cada valor.",
    unsupported: true,
  },
  {
    k: "+xyz",
    d: "Sólo para Cash 3 Straight. Ingresar una jugada de tres dígitos seguido del signo + y otra jugada de tres dígitos (Ej.: 345+348) para generar una secuencia de straight: 345, 346, 347.",
    unsupported: true,
  },
];

function HelpRow({ k, d, muted }: { k: string; d: string; muted?: boolean }) {
  return (
    <li className={muted ? "cajero-vq-help-row--muted" : undefined}>
      <kbd>{k}</kbd>
      <span>{d}</span>
    </li>
  );
}

const MODAL_TITLES: Record<Exclude<MenuModal, null>, string> = {
  help: "Ayuda",
  config: "Configuración",
  ventas: "Ventas de hoy",
  historicas: "Ventas históricas",
  directorio: "Directorio telefónico",
};

function formatSaleWhen(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

type BancaStatus = {
  settings: {
    bancaName: string;
    terminalCode: string;
    expensiveDirectoAmount: number;
    maxDirectoPerNumber: number;
    maxPalePerNumber: number;
    maxTripletaPerNumber: number;
    maxSuperPalePerNumber: number;
  };
  currentBalance: number;
  openingBalance: number;
  status: string;
};

export function CajeroVanqueroMenu({
  onDuplicate,
  onFocusJugadas,
  onBancaChange,
}: {
  draws?: OpenDrawView[];
  dayPlays?: number;
  daySales?: number;
  cartCount?: number;
  cartTotal?: number;
  onDuplicate: () => void;
  onFocusJugadas: () => void;
  onBancaChange?: () => void;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<MenuModal>(null);
  const [salesData, setSalesData] = useState<DashboardSales | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState("");
  const [historyDate, setHistoryDate] = useState(todayMonitorDateInput);
  const [pendingCount, setPendingCount] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [banca, setBanca] = useState<BancaStatus | null>(null);
  const [bancaMsg, setBancaMsg] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [bancaBusy, setBancaBusy] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const res = await fetch("/api/cajero/tickets", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setPendingCount((data.pending ?? []).length);
    } catch {
      /* ignore */
    }
  }, []);

  const loadSalesData = useCallback(async (date?: string) => {
    setSalesLoading(true);
    setSalesError("");
    const targetDate = date ?? todayMonitorDateInput();
    const isToday = targetDate === todayMonitorDateInput();

    try {
      if (isToday && modal !== "historicas") {
        const res = await fetch("/api/cajero/dashboard", { credentials: "include" });
        const text = await res.text();
        let data: Record<string, unknown> = {};
        try {
          data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
        } catch {
          throw new Error("Respuesta inválida del servidor.");
        }
        if (res.ok) {
          setSalesData((data.cashSales as DashboardSales) ?? null);
          return;
        }
      }

      const reportRes = await fetch(
        `/api/cajero/sales-report?date=${encodeURIComponent(targetDate)}`,
        { credentials: "include" }
      );
      const reportText = await reportRes.text();
      const reportData = reportText
        ? (JSON.parse(reportText) as Record<string, unknown>)
        : {};
      if (!reportRes.ok) {
        throw new Error(String(reportData.error ?? "No se pudo cargar ventas."));
      }
      const report = reportData.report as {
        totalTickets: number;
        sales: number;
        recentSales: SaleRow[];
      };
      setSalesData({
        count: report.totalTickets,
        playsCount: report.totalTickets,
        total: report.sales,
        recent: report.recentSales,
        history: report.recentSales,
      });
    } catch (e) {
      setSalesError(e instanceof Error ? e.message : "Error al cargar.");
      setSalesData(null);
    } finally {
      setSalesLoading(false);
    }
  }, [modal]);

  const loadBanca = useCallback(async () => {
    try {
      const res = await fetch("/api/cajero/banca", { credentials: "include" });
      if (!res.ok) return;
      setBanca((await res.json()) as BancaStatus);
    } catch {
      /* ignore */
    }
  }, []);

  async function bancaAction(action: "recharge" | "close") {
    setBancaBusy(true);
    setBancaMsg("");
    try {
      const body =
        action === "recharge"
          ? { action, amount: Number(rechargeAmount) }
          : { action };
      const res = await fetch("/api/cajero/banca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error en banca.");
      setBanca(data.status as BancaStatus);
      setRechargeAmount("");
      setBancaMsg(
        action === "close"
          ? `Banca cerrada · ${formatMoney(data.closingBalance)}`
          : `Recarga aplicada · ${formatMoney(data.balance)}`
      );
      onBancaChange?.();
    } catch (e) {
      setBancaMsg(e instanceof Error ? e.message : "Error.");
    } finally {
      setBancaBusy(false);
    }
  }

  useEffect(() => {
    void refreshPendingCount();
    const t = setInterval(refreshPendingCount, 30000);
    return () => clearInterval(t);
  }, [refreshPendingCount]);

  useEffect(() => {
    if (modal === "ventas") void loadSalesData();
    if (modal === "historicas") void loadSalesData(historyDate);
    if (modal === "config") void loadBanca();
  }, [modal, loadSalesData, loadBanca, historyDate]);

  useEffect(() => {
    if (!modal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModal(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/cajero/login");
    router.refresh();
  }, [router]);

  const navigate = useCallback(
    (href: string) => {
      setModal(null);
      router.push(href);
    },
    [router]
  );

  const handleItem = useCallback(
    (item: (typeof MENU_ITEMS)[number]) => {
      switch (item.action) {
        case "logout":
          void logout();
          return;
        case "nav":
          if (item.href) navigate(item.href);
          return;
        case "duplicate":
          setModal(null);
          onDuplicate();
          return;
        case "jugadas":
          setModal(null);
          onFocusJugadas();
          return;
        case "report":
          setModal(null);
          setReportOpen(true);
          return;
        case "help":
        case "config":
        case "ventas":
        case "historicas":
        case "directorio":
          setModal(item.action);
          return;
        default:
          return;
      }
    },
    [logout, navigate, onDuplicate, onFocusJugadas]
  );

  const openTicket = useCallback(
    (ticketNumber: string) => {
      setModal(null);
      router.push(`/cajero/tickets?q=${encodeURIComponent(ticketNumber)}`);
    },
    [router]
  );

  function renderSalesList(rows: SaleRow[], empty: string) {
    if (salesLoading) return <p className="cajero-vq-modal-note">Cargando…</p>;
    if (salesError) return <p className="cajero-vq-modal-error">{salesError}</p>;
    if (rows.length === 0) return <p className="cajero-vq-modal-note">{empty}</p>;

    return (
      <ul className="cajero-vq-sales-list">
        {rows.map((s) => (
          <li key={`${s.ticketNumber}-${s.createdAt}`}>
            <button
              type="button"
              className="cajero-vq-sales-row-btn"
              onClick={() => openTicket(s.ticketNumber)}
            >
              <strong>{s.customerName?.trim() || s.ticketNumber}</strong>
              <span>
                {formatMoney(s.totalAmount)} · {formatSaleWhen(s.createdAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <aside className="cajero-vq-menu">
        <p className="cajero-vq-menu-title">Opciones</p>
        <nav className="cajero-vq-menu-list" aria-label="Menú vanquero">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="cajero-vq-menu-btn"
              onClick={() => handleItem(item)}
            >
              <span>{item.label}</span>
              {item.id === "pendientes" && pendingCount > 0 && (
                <span className="cajero-vq-menu-badge">{pendingCount}</span>
              )}
            </button>
          ))}
          <button
            type="button"
            className="cajero-vq-menu-btn cajero-vq-menu-btn--logout"
            onClick={() =>
              handleItem({
                id: "logout",
                label: "Cerrar sesión",
                action: "logout",
              })
            }
          >
            Cerrar sesión
          </button>
        </nav>
      </aside>

      <CajeroSalesReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />

      {modal && (
        <div
          className="cajero-vq-modal-backdrop"
          onClick={() => setModal(null)}
          role="presentation"
        >
          <div
            className="cajero-vq-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
            aria-labelledby="cajero-vq-modal-title"
          >
            <header className="cajero-vq-modal-head">
              <h2 id="cajero-vq-modal-title">{MODAL_TITLES[modal]}</h2>
              <button type="button" onClick={() => setModal(null)} aria-label="Cerrar">
                ×
              </button>
            </header>

            <div className="cajero-vq-modal-body">
              {modal === "help" && (
                <div className="cajero-vq-help">
                  <h4 className="cajero-vq-help-heading">Teclas</h4>
                  <ul className="cajero-vq-help-list">
                    {HELP_KEYS.map((row) => (
                      <HelpRow key={row.k} k={row.k} d={row.d} />
                    ))}
                  </ul>
                  <h4 className="cajero-vq-help-heading">¿Cómo jugar?</h4>
                  <ul className="cajero-vq-help-list">
                    {HELP_PLAY.map((row) => (
                      <HelpRow
                        key={row.k}
                        k={row.k}
                        d={row.d}
                        muted={row.unsupported}
                      />
                    ))}
                  </ul>
                  <p className="cajero-vq-help-note">
                    El monto se mantiene entre jugadas. Tras agregar, escriba el
                    siguiente número y Enter. Directo = 2 dígitos · Palé = 4 ·
                    Tripleta = 6.
                  </p>
                </div>
              )}

              {modal === "config" && (
                <div className="cajero-vq-config-panel">
                  {banca && (
                    <div className="cajero-vq-banca-panel">
                      <p>
                        <strong>{banca.settings.bancaName}</strong> ·{" "}
                        {banca.settings.terminalCode}
                      </p>
                      <p>
                        Balance: <strong>{formatMoney(banca.currentBalance)}</strong>
                      </p>
                      <p className="cajero-vq-modal-note">
                        Apertura: {formatMoney(banca.openingBalance)} · Directo
                        costoso ≥ {formatMoney(banca.settings.expensiveDirectoAmount)} · Límites
                        número: Directo {formatMoney(banca.settings.maxDirectoPerNumber)} · Palé{" "}
                        {formatMoney(banca.settings.maxPalePerNumber)} · Tripleta{" "}
                        {formatMoney(banca.settings.maxTripletaPerNumber)} · Súper Palé{" "}
                        {formatMoney(banca.settings.maxSuperPalePerNumber)}
                      </p>
                      <label className="cajero-vq-config-field">
                        <span>Recarga de venta</span>
                        <input
                          type="number"
                          min={1}
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          disabled={bancaBusy || banca.status !== "OPEN"}
                        />
                      </label>
                      <div className="cajero-vq-banca-actions">
                        <button
                          type="button"
                          className="cajero-vq-modal-link-btn"
                          disabled={
                            bancaBusy ||
                            banca.status !== "OPEN" ||
                            !rechargeAmount
                          }
                          onClick={() => void bancaAction("recharge")}
                        >
                          Recargar
                        </button>
                        <button
                          type="button"
                          className="cajero-vq-modal-link-btn"
                          disabled={bancaBusy || banca.status !== "OPEN"}
                          onClick={() => {
                            if (
                              window.confirm(
                                "¿Cerrar la banca del día? No se podrán registrar más movimientos."
                              )
                            ) {
                              void bancaAction("close");
                            }
                          }}
                        >
                          Cerrar banca
                        </button>
                      </div>
                      {bancaMsg && (
                        <p className="cajero-vq-modal-note">{bancaMsg}</p>
                      )}
                    </div>
                  )}
                  <p className="cajero-vq-modal-note">
                    Monto mínimo por jugada: {formatMoney(1)} (se ingresa manualmente en cada jugada).
                  </p>
                  <p className="cajero-vq-modal-note">
                    Teléfono en recibo: {RECEIPT_CONFIG.phone}
                  </p>
                </div>
              )}

              {modal === "historicas" && (
                <form
                  className="cajero-report-date-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void loadSalesData(historyDate);
                  }}
                >
                  <label>
                    <span>Fecha</span>
                    <input
                      type="date"
                      value={historyDate}
                      onChange={(e) => setHistoryDate(e.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    className="cajero-vq-modal-link-btn"
                    disabled={salesLoading}
                  >
                    Buscar
                  </button>
                </form>
              )}

              {modal === "ventas" &&
                renderSalesList(
                  salesData?.recent ?? [],
                  "Sin ventas en efectivo hoy."
                )}

              {modal === "historicas" &&
                renderSalesList(
                  salesData?.history ?? [],
                  "Sin ventas históricas registradas."
                )}

              {modal === "directorio" && (
                <ul className="cajero-vq-phone-list">
                  {CAJERO_PHONE_DIRECTORY.map((entry) => (
                    <li key={`${entry.name}-${entry.phone}`}>
                      <strong>{entry.name}</strong>
                      <a
                        href={`tel:${entry.phone.replace(/\D/g, "")}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entry.phone}
                      </a>
                      {entry.note && (
                        <span className="cajero-vq-phone-note">{entry.note}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {(modal === "ventas" || modal === "historicas") && salesData && (
              <footer className="cajero-vq-modal-foot">
                <span>
                  {modal === "historicas" ? historyDate : "Hoy"}: {salesData.count}{" "}
                  tickets · {formatMoney(salesData.total)}
                </span>
                <button
                  type="button"
                  className="cajero-vq-modal-link-btn"
                  onClick={() => navigate("/cajero/monitor")}
                >
                  Abrir monitor
                </button>
              </footer>
            )}

            {modal === "directorio" && (
              <footer className="cajero-vq-modal-foot">
                <button type="button" onClick={() => setModal(null)}>
                  Cerrar
                </button>
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  );
}
