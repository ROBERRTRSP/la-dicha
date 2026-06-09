"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketReceipt } from "@/components/player/TicketReceipt";
import { TicketActionSheet } from "@/components/player/TicketActionSheet";
import type { ReceiptData } from "@/lib/ticket-receipt";
import type { CartLine } from "@/lib/tickets";

export type TicketFeedItem = {
  id: string;
  ticketNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  data: ReceiptData;
  cartLines: CartLine[];
};

export function TicketsList({ tickets }: { tickets: TicketFeedItem[] }) {
  const router = useRouter();
  const [active, setActive] = useState<TicketFeedItem | null>(null);

  return (
    <>
      <div className="tickets-feed">
        {tickets.map((t) => (
          <div key={t.id} className="tickets-feed-item">
            <button
              type="button"
              className="tickets-feed-tap"
              onClick={() => setActive(t)}
              aria-label={`Opciones ticket ${t.ticketNumber}`}
            >
              <TicketReceipt data={t.data} />
            </button>
          </div>
        ))}
      </div>

      {active && (
        <TicketActionSheet
          open
          ticketId={active.id}
          ticketNumber={active.ticketNumber}
          totalAmount={active.totalAmount}
          status={active.status}
          createdAt={active.createdAt}
          cartLines={active.cartLines}
          onClose={() => setActive(null)}
          onCanceled={() => router.refresh()}
        />
      )}
    </>
  );
}
