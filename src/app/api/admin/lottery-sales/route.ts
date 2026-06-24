import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminLotteryAccounting,
  type PaymentFilter,
} from "@/lib/admin-lottery-sales";

function parsePayment(value: string | null): PaymentFilter {
  if (value === "WALLET" || value === "CASH") return value;
  return "ALL";
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const drawId = searchParams.get("drawId") ?? undefined;
  const payment = parsePayment(searchParams.get("payment"));

  const report = await getAdminLotteryAccounting({ date, drawId, payment });
  return NextResponse.json(report);
}
