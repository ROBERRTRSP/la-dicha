"use client";

import {
  buildReceiptDisplayLines,
  type ReceiptData,
  type ReceiptDisplayLine,
} from "@/lib/ticket-receipt";
import { ReceiptWatermark } from "@/components/player/ReceiptWatermark";
import { cn } from "@/lib/utils";

function ReceiptLine({ line }: { line: ReceiptDisplayLine }) {
  switch (line.type) {
    case "brand":
      return <p className="receipt-brand">{line.text}</p>;
    case "status":
      return <p className="receipt-status">{line.text}</p>;
    case "datetime":
      return <p className="receipt-datetime">{line.text}</p>;
    case "ticket-hero":
      return <p className="receipt-ticket-hero">{line.text}</p>;
    case "meta":
      return (
        <p className="receipt-meta">
          <span className="receipt-meta-label">{line.label}</span>
          <span className="receipt-meta-value">{line.value}</span>
        </p>
      );
    case "hash":
      return <p className="receipt-hash">{line.text}</p>;
    case "divider":
      return <p className="receipt-divider" aria-hidden>{"".padEnd(42, "=")}</p>;
    case "lottery":
      return (
        <p className="receipt-lottery-block">
          <span className="receipt-lottery-name">{line.title}</span>
          <span className="receipt-lottery-sub">:{line.subtotal}</span>
        </p>
      );
    case "col-header":
      return (
        <p className="receipt-col-header">
          <span>JUGADA</span>
          <span>MONTO</span>
          <span>JUGADA</span>
          <span>MONTO</span>
        </p>
      );
    case "bet-row":
      return (
        <p className="receipt-bet-row">
          <span className="receipt-bet-cell">
            <span className="receipt-bet-play">{line.left.play}</span>
            <span className="receipt-bet-amount">{line.left.amount}</span>
          </span>
          {line.right ? (
            <span className="receipt-bet-cell">
              <span className="receipt-bet-play">{line.right.play}</span>
              <span className="receipt-bet-amount">{line.right.amount}</span>
            </span>
          ) : (
            <span className="receipt-bet-cell receipt-bet-cell--empty" />
          )}
        </p>
      );
    case "total":
      return <p className="receipt-total">-- TOTAL: {line.amount} --</p>;
    case "balance":
      return (
        <p className="receipt-balance">
          Bal {line.before} &gt; {line.after}
        </p>
      );
    case "prizes":
      return <p className="receipt-prizes">{line.text}</p>;
    case "footer":
      return <p className="receipt-footer">{line.text}</p>;
    default:
      return null;
  }
}

export function TicketReceipt({
  data,
  qrDataUrl,
  className,
}: {
  data: ReceiptData;
  qrDataUrl?: string;
  className?: string;
}) {
  const lines = buildReceiptDisplayLines(data);

  return (
    <div className={cn("receipt-root", className)}>
      <article className="receipt-paper-2010">
        <ReceiptWatermark className="receipt-watermark--2010" />
        <div className="receipt-paper-text">
          {lines.map((line, i) => (
            <ReceiptLine key={i} line={line} />
          ))}
        </div>
        {qrDataUrl && (
          <div className="receipt-paper-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="QR"
              width={120}
              height={120}
              className="receipt-paper-qr-img"
            />
          </div>
        )}
        <div className="receipt-paper-tear" aria-hidden />
      </article>
    </div>
  );
}
