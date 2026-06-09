import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardStats } from "@/lib/admin-dashboard";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const stats = await getAdminDashboardStats();
  return NextResponse.json(stats);
}
