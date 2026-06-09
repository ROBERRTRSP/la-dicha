"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TicketReceipt } from "@/components/player/TicketReceipt";
import { PrintButton } from "@/components/player/PrintButton";
import { formatThermalReceipt, type ReceiptData } from "@/lib/ticket-receipt";

type TicketData = {
  id: string;
  ticketNumber: string;
  verificationCode: string;
  totalAmount: number;
  balanceBefore?: number;
  balanceAfter: number;
  createdAt: string;
  customerName?: string | null;
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
  cashSale,
  newBetLabel = "Volver a jugar",
}: {
  ticket: TicketData;
  qrDataUrl?: string;
  onNewBet: () => void;
  cashSale?: boolean;
  newBetLabel?: string;
}) {
  const receiptData: ReceiptData = {
    ticketNumber: ticket.ticketNumber,
    verificationCode: ticket.verificationCode,
    createdAt: ticket.createdAt,
    totalAmount: ticket.totalAmount,
    balanceBefore: cashSale ? undefined : ticket.balanceBefore,
    balanceAfter: cashSale ? undefined : ticket.balanceAfter,
    status: "ACTIVE",
    paymentMethod: cashSale ? "CASH" : "WALLET",
    playerName: ticket.customerName?.trim() || undefined,
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
          {cashSale ? "*** VENTA EN EFECTIVO ***" : "*** TICKET GENERADO ***"}
        </p>
        <TicketReceipt data={receiptData} qrDataUrl={qrDataUrl} />
      </div>

      <div className="ticket-success-actions no-print">
        {cashSale ? (
          <PrintButton className="receipt-action-btn primary" />
        ) : (
          <button type="button" onClick={shareWhatsApp} className="receipt-action-btn primary">
            Compartir WhatsApp
          </button>
        )}
        <button type="button" onClick={onNewBet} className="receipt-action-btn ghost">
          {newBetLabel}
        </button>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
