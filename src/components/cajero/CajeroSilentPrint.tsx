"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TicketReceipt } from "@/components/player/TicketReceipt";
import type { ReceiptData } from "@/lib/ticket-receipt";

type SoldTicket = {
  ticketNumber: string;
  internalTicketCode?: string | null;
  verificationCode: string;
  totalAmount: number;
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

/** Imprime el ticket sin pantalla de éxito; vuelve al vanquero al cerrar impresión. */
export function CajeroSilentPrint({
  ticket,
  qrDataUrl,
  onDone,
}: {
  ticket: SoldTicket;
  qrDataUrl?: string;
  onDone: () => void;
}) {
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const [mounted, setMounted] = useState(false);

  onDoneRef.current = onDone;

  const receiptData: ReceiptData = {
    businessName: "ELITE 13",
    ticketNumber: ticket.ticketNumber,
    internalTicketCode: ticket.internalTicketCode,
    verificationCode: ticket.verificationCode,
    createdAt: ticket.createdAt,
    totalAmount: ticket.totalAmount,
    status: "ACTIVE",
    paymentMethod: "CASH",
    playerName: ticket.customerName?.trim() || undefined,
    items: ticket.items,
  };

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("cajero-printing");

    function finish() {
      if (doneRef.current) return;
      doneRef.current = true;
      document.body.classList.remove("cajero-printing");
      onDoneRef.current();
    }

    function onAfterPrint() {
      finish();
    }

    window.addEventListener("afterprint", onAfterPrint);
    const printTimer = setTimeout(() => window.print(), 350);
    const fallback = setTimeout(finish, 8000);

    return () => {
      clearTimeout(printTimer);
      clearTimeout(fallback);
      window.removeEventListener("afterprint", onAfterPrint);
      document.body.classList.remove("cajero-printing");
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="cajero-silent-print-root" aria-hidden>
      <TicketReceipt data={receiptData} qrDataUrl={qrDataUrl} />
    </div>,
    document.body
  );
}
