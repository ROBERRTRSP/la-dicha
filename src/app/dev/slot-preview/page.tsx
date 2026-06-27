import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SlotVisualPreviewMachine } from "@/components/casino/preview/SlotVisualPreviewMachine";
import { isSlotVisualPreviewEnabled } from "@/lib/slots/preview-access";

export const metadata: Metadata = {
  title: "Slot Preview Demo",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default function SlotPreviewPage() {
  if (!isSlotVisualPreviewEnabled()) {
    notFound();
  }

  return <SlotVisualPreviewMachine />;
}
