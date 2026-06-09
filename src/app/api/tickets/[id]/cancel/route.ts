import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { cancelTicket } from "@/lib/tickets";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await cancelTicket(user.id, id);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo cancelar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
