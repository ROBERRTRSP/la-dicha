import { getOpenDrawsForPlayer } from "@/lib/draws";
import { CajeroSellClient } from "@/components/cajero/CajeroSellClient";

export default async function CajeroVenderPage() {
  const draws = await getOpenDrawsForPlayer();
  return <CajeroSellClient initialDraws={draws} />;
}
