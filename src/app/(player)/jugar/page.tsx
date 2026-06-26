import { requirePlayer } from "@/lib/auth";
import { getCajeroSellDraws } from "@/lib/draws";
import { redirect } from "next/navigation";
import { PlayClient } from "./PlayClient";

export default async function JugarPage() {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const { draws, superPales } = await getCajeroSellDraws();

  return (
    <PlayClient
      initialDraws={draws}
      initialSuperPales={superPales}
      balance={user.wallet?.balance ?? 0}
    />
  );
}
