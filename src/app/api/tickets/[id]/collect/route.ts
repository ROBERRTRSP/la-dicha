import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";

/** Los premios de lotería solo se pagan en ventanilla (cajero/admin), no al saldo. */
export async function POST() {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error:
        "Los premios de lotería se cobran en ventanilla con tu cajero. No se acreditan al saldo de la app.",
    },
    { status: 403 }
  );
}
