import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { isRouletteActive } from "@/lib/roulette";
import { RouletteClient } from "@/components/roulette/RouletteClient";

export default async function RuletaPage() {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const active = await isRouletteActive();

  return (
    <RouletteClient
      balance={user.wallet?.balance ?? 0}
      key={active ? "on" : "off"}
    />
  );
}
