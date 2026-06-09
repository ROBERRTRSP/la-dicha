"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TicketReceipt } from "@/components/player/TicketReceipt";
import { formatThermalReceipt, type ReceiptData } from "@/lib/ticket-receipt";

type TicketData = {
  id: string;
  ticketNumber: string;
  verificationCode: string;
  totalAmount: number;
  balanceBefore?: number;
  balanceAfter: number;
  createdAt: string;
  items: {
    betType: string;
    numbers: string;
    lotteryName: string;
    amount: number;
    drawTime?: string;
    drawDate?: string;
    superPaleName?: string | null;
  }[];
};

export function TicketSuccess({
  ticket,
  qrDataUrl,
  onNewBet,
}: {
  ticket: TicketData;
  qrDataUrl?: string;
  onNewBet: () => void;
}) {
  const receiptData: ReceiptData = {
    ticketNumber: ticket.ticketNumber,
    verificationCode: ticket.verificationCode,
    createdAt: ticket.createdAt,
    totalAmount: ticket.totalAmount,
    balanceBefore: ticket.balanceBefore,
    balanceAfter: ticket.balanceAfter,
    status: "ACTIVE",
    items: ticket.items,
  };

  const shareText = formatThermalReceipt(receiptData);

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank"
    );
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("ticket-success-open");
    return () => document.body.classList.remove("ticket-success-open");
  }, []);

  const content = (
    <div className="ticket-success-screen">
      <div className="ticket-success-scroll">
        <p className="text-center text-[11px] text-[#444] font-bold mb-3 no-print receipt-counter-label">
          *** TICKET GENERADO ***
        </p>
        <TicketReceipt data={receiptData} qrDataUrl={qrDataUrl} />
      </div>

      <div className="ticket-success-actions no-print">
        <button type="button" onClick={shareWhatsApp} className="receipt-action-btn primary">
          Compartir WhatsApp
        </button>
        <button type="button" onClick={onNewBet} className="receipt-action-btn ghost">
          Volver a jugar
        </button>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
