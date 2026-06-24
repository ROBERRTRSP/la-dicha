import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import type { PaymentFilter } from "@/lib/admin-lottery-sales";
import {
  calculateRiskInventory,
  type RiskBetTypeFilter,
  type RiskCategoryFilter,
  type RiskSortBy,
  type RiskStatusFilter,
} from "@/lib/lottery-risk";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const channel = (searchParams.get("channel") ??
    searchParams.get("payment") ??
    "ALL") as PaymentFilter;
  const lotteryCode = searchParams.get("lotteryCode") ?? undefined;
  const status = (searchParams.get("status") ?? "ALL") as RiskStatusFilter;
  const betType = (searchParams.get("betType") ?? "ALL") as RiskBetTypeFilter;
  const category = (searchParams.get("category") ?? "ALL") as RiskCategoryFilter;
  const sortBy = (searchParams.get("sortBy") ?? "priority") as RiskSortBy;

  const report = await calculateRiskInventory({
    date,
    channel,
    lotteryCode,
    status,
    betType,
    category,
    sortBy,
  });

  return NextResponse.json(report);
}
