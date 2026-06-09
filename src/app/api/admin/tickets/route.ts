import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();

  const tickets = await prisma.ticket.findMany({
    where: q
      ? {
          OR: [
            { ticketNumber: { contains: q } },
            { verificationCode: { contains: q } },
            { user: { username: { contains: q } } },
            { user: { fullName: { contains: q } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { fullName: true, username: true } },
      items: { include: { draw: { include: { lottery: true } } } },
    },
  });

  return NextResponse.json({ tickets });
}
