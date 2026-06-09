import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { getPlayerTickets } from "@/lib/ticket-retention";
import { buildReceiptData } from "@/lib/build-receipt-data";
import { ticketItemsToCartLines } from "@/lib/ticket-cart";
import { BrandHeader } from "@/components/player/BrandHeader";
import { TicketsList } from "@/components/player/TicketsList";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";

export default async function TicketsPage() {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const tickets = await getPlayerTickets(user.id);

  const feed = tickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    totalAmount: t.totalAmount,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    data: buildReceiptData(t, user),
    cartLines: ticketItemsToCartLines(t.items),
  }));

  return (
    <div className="tickets-page">
      <BrandHeader
        balance={user.wallet?.balance ?? 0}
        title={`Tickets (${tickets.length})`}
      />

      {tickets.length === 0 ? (
        <div className="tickets-empty">
          <AiVisual
            src={ART.emptyTickets}
            alt=""
            width={160}
            height={160}
            className="empty-state-art mx-auto mb-3"
          />
          <p className="text-slate-500 text-sm">Aún no tienes tickets.</p>
          <Link href="/jugar" className="text-[#0d9488] font-semibold text-sm mt-3">
            Ir a jugar →
          </Link>
        </div>
      ) : (
        <TicketsList tickets={feed} />
      )}
    </div>
  );
}
