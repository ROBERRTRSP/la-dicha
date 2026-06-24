import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { getCajeroTicketMonitor } from "@/lib/cajero-ticket-monitor";
import { todayMonitorDateInput } from "@/lib/cajero-monitor-date";

export async function GET(request: Request) {
  try {
    const cajero = await requireCajero();
    if (!cajero) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const date = params.get("date")?.trim() || todayMonitorDateInput();

    const data = await getCajeroTicketMonitor(date);
    return NextResponse.json({ date, ...data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al cargar monitor.";
    console.error("[cajero/monitor]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
