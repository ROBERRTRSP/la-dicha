import { requirePlayer } from "@/lib/auth";
import { getOpenDrawsForPlayer } from "@/lib/draws";
import { redirect } from "next/navigation";
import { PlayClient } from "./PlayClient";

export default async function JugarPage() {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const draws = await getOpenDrawsForPlayer();

  return (
    <PlayClient
      initialDraws={draws}
      balance={user.wallet?.balance ?? 0}
    />
  );
}
