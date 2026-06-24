import type { CajeroSalesReport } from "./cajero-sales-report";
import { RECEIPT_CONFIG } from "./receipt-config";
import { formatMoney } from "@/lib/utils";

function money(n: number) {
  return formatMoney(n);
}

function formatReportDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export function buildSalesReportHtml(report: CajeroSalesReport): string {
  const drawRows = report.draws
    .map(
      (r) =>
        `<tr><td>${r.lotteryName}</td><td class="r">${r.sales.toFixed(2)}</td><td class="r">${r.commission.toFixed(2)}</td><td class="r">${r.prizes.toFixed(2)}</td><td class="r">${r.net.toFixed(2)}</td></tr>`
    )
    .join("");

  const winnerTicketRows = report.winnerTickets.length
    ? report.winnerTickets
        .map(
          (t) =>
            `<tr><td>${new Date(t.createdAt).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" })}</td><td>${t.ticketNumber}</td><td class="r">${t.toPay.toFixed(2)}</td><td class="r">${t.paid.toFixed(2)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="c">No hay información disponible</td></tr>`;

  const winnerNumberRows = report.winnerNumbers.length
    ? report.winnerNumbers
        .map(
          (w) =>
            `<tr><td>${w.shortLabel}</td><td class="c">${w.first}</td><td class="c">${w.second}</td><td class="c">${w.third}</td><td></td></tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="c">Sin resultados confirmados</td></tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Reporte de ventas</title>
<style>
  @page { size: auto; margin: 8mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 8px; }
  h1 { font-size: 14px; margin: 0 0 4px; text-align: center; }
  h2 { font-size: 12px; margin: 12px 0 4px; border-bottom: 1px solid #ccc; }
  p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10px; }
  th, td { border: 1px solid #ddd; padding: 3px 4px; }
  th { background: #f1f5f9; text-align: left; }
  .r { text-align: right; }
  .c { text-align: center; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
  .summary td:first-child { font-weight: 600; width: 55%; }
</style></head><body>
<h1>${RECEIPT_CONFIG.businessName} — Reporte de ventas</h1>
<p class="c">${formatReportDate(report.date)}</p>
<div class="grid">
  <p>Balance a la fecha: <strong>${money(report.balanceAtDate)}</strong></p>
  <p>Monto tickets pendientes: <strong>${money(report.pendingAmount)}</strong></p>
  <p>Banca: <strong>${report.bancaName}</strong></p>
  <p>Código: <strong>${report.terminalCode}</strong></p>
</div>
<table class="summary">
  <tr><td>Pendiente</td><td class="r">${report.pendingCount}</td></tr>
  <tr><td>Perdedores</td><td class="r">${report.losersCount}</td></tr>
  <tr><td>Ganadores</td><td class="r">${report.winnersCount}</td></tr>
  <tr><td>Total tickets</td><td class="r">${report.totalTickets}</td></tr>
  <tr><td>Balance inicial</td><td class="r">${report.openingBalance.toFixed(2)}</td></tr>
  <tr><td>Venta</td><td class="r">${report.sales.toFixed(2)}</td></tr>
  <tr><td>Comisiones</td><td class="r">${report.commissions.toFixed(2)}</td></tr>
  <tr><td>Premios</td><td class="r">${report.prizes.toFixed(2)}</td></tr>
  <tr><td>Neto</td><td class="r">${report.net.toFixed(2)}</td></tr>
  <tr><td>Final</td><td class="r">${report.finalBalance.toFixed(2)}</td></tr>
  <tr><td>Balance</td><td class="r">${report.balance.toFixed(2)}</td></tr>
</table>
<h2>Totales por sorteo</h2>
<table>
  <thead><tr><th>Sorteo</th><th>Venta</th><th>Comisiones</th><th>Premios</th><th>Neto</th></tr></thead>
  <tbody>
    ${drawRows}
    <tr><td><strong>Total</strong></td><td class="r"><strong>${report.sales.toFixed(2)}</strong></td><td class="r"><strong>${report.commissions.toFixed(2)}</strong></td><td class="r"><strong>${report.prizes.toFixed(2)}</strong></td><td class="r"><strong>${report.net.toFixed(2)}</strong></td></tr>
  </tbody>
</table>
<h2>Tickets ganadores</h2>
<table>
  <thead><tr><th>Fecha</th><th>Número</th><th>A pagar</th><th>Pagado</th></tr></thead>
  <tbody>${winnerTicketRows}</tbody>
</table>
<h2>Números ganadores</h2>
<table>
  <thead><tr><th>Sorteo</th><th>1ra</th><th>2da</th><th>3ra</th><th></th></tr></thead>
  <tbody>${winnerNumberRows}</tbody>
</table>
</body></html>`;
}
