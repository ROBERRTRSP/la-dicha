import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import QRCode from "qrcode";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandHeader } from "@/components/player/BrandHeader";
import { TicketReceipt } from "@/components/player/TicketReceipt";
import { buildReceiptData } from "@/lib/build-receipt-data";
import { PrintButton } from "@/components/player/PrintButton";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: user.id },
    include: { items: { include: { draw: { include: { lottery: true } } } } },
  });

  if (!ticket) notFound();

  const qrData = `LA-DICHA|${ticket.ticketNumber}|${ticket.verificationCode}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 200 });

  const receiptData = buildReceiptData(ticket, user);

  return (
    <div className="player-content--scroll ticket-detail-page">
      <BrandHeader balance={user.wallet?.balance ?? 0} title="Ticket" compact />

      <div className="px-3 py-4 max-w-[88mm] mx-auto ticket-detail-page bg-[#a8a8a8] min-h-full">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1 text-sm text-slate-500 mb-4 no-print"
        >
          Volver a tickets
        </Link>

        <TicketReceipt data={receiptData} qrDataUrl={qrDataUrl} />

        <PrintButton className="receipt-action-btn w-full mt-4 no-print" />
      </div>
    </div>
  );
}
