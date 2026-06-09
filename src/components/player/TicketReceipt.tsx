"use client";

import Image from "next/image";
import {
  buildReceiptLinesForDisplay,
  isLotteryTitleLine,
  parseBetLine,
  type ReceiptData,
} from "@/lib/ticket-receipt";
import { ReceiptWatermark } from "@/components/player/ReceiptWatermark";
import { cn } from "@/lib/utils";

export function TicketReceipt({
  data,
  qrDataUrl,
  className,
}: {
  data: ReceiptData;
  qrDataUrl?: string;
  className?: string;
}) {
  const lines = buildReceiptLinesForDisplay(data);

  return (
    <div className={cn("receipt-root", className)}>
      <article className="receipt-paper-2010">
        <ReceiptWatermark className="receipt-watermark--2010" />
        <div className="receipt-paper-text">
          {lines.map((line, i) => {
            const lotteryTitle = isLotteryTitleLine(line);
            if (lotteryTitle) {
              return (
                <p key={i} className="receipt-lottery-title">
                  {lotteryTitle}
                </p>
              );
            }
            const bet = parseBetLine(line);
            if (bet) {
              return (
                <p key={i} className="receipt-bet-line">
                  <span className="receipt-bet-play">{bet.play}</span>
                  <span className="receipt-bet-amount">{bet.amount}</span>
                </p>
              );
            }
            return (
              <p key={i} className="receipt-line">
                {line || "\u00A0"}
              </p>
            );
          })}
        </div>
        {qrDataUrl && (
          <div className="receipt-paper-qr">
            <Image
              src={qrDataUrl}
              alt="QR"
              width={90}
              height={90}
              className="receipt-paper-qr-img"
            />
          </div>
        )}
        <div className="receipt-paper-tear" aria-hidden />
      </article>
    </div>
  );
}
