import { redirect, notFound } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { ModernSlotMachine } from "@/components/casino/ModernSlotMachine";
import { isSlotGameId } from "@/lib/slots/games";
import type { SlotGameId } from "@/lib/slots/types";
import { isSlotsActive } from "@/lib/slots/spin-service";

export default async function CasinoSlotPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const { gameId } = await params;
  if (!isSlotGameId(gameId)) notFound();

  const active = await isSlotsActive();
  if (!active) redirect("/ruleta");

  return (
    <ModernSlotMachine
      gameId={gameId as SlotGameId}
      initialBalance={user.wallet?.balance ?? 0}
    />
  );
}
