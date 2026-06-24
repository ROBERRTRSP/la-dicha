import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { getCajeroSalesReport } from "@/lib/cajero-sales-report";

export async function GET(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const date = new URL(request.url).searchParams.get("date") ?? undefined;
    const report = await getCajeroSalesReport(date);
    return NextResponse.json({ report });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar reporte.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
