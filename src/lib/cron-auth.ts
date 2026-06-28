import { NextResponse } from "next/server";

/** Valida Authorization Bearer contra CRON_SECRET. En producción exige secret configurado. */
export function cronAuthResponse(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const isHostedProd = process.env.VERCEL_ENV === "production";

  if (isHostedProd && !secret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en producción." },
      { status: 503 },
    );
  }

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  return null;
}
