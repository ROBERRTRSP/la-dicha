import Image from "next/image";
import { ART } from "@/lib/visual-assets";
import { cn } from "@/lib/utils";

export function ReceiptWatermark({ className }: { className?: string }) {
  return (
    <div className={cn("receipt-watermark", className)} aria-hidden>
      <Image
        src={ART.sealWatermark}
        alt=""
        width={200}
        height={200}
        className="receipt-watermark-img"
      />
    </div>
  );
}
