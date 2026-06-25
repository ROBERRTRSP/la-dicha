import { redirect, notFound } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { Classic7SlotMachine } from "@/components/casino/classic-7/Classic7SlotMachine";
import { isSlotsActive } from "@/lib/slots/spin-service";

export default async function Classic7Page() {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  if (!(await isSlotsActive())) redirect("/ruleta");

  return (
    <Classic7SlotMachine initialBalance={user.wallet?.balance ?? 0} />
  );
}
