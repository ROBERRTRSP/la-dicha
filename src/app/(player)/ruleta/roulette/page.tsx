import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { isRouletteActive } from "@/lib/roulette";
import { RouletteClient } from "@/components/roulette/RouletteClient";

export default async function CasinoRoulettePage() {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const active = await isRouletteActive();
  if (!active) redirect("/ruleta");

  return (
    <RouletteClient
      balance={user.wallet?.balance ?? 0}
      key={active ? "on" : "off"}
    />
  );
}
