import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { CasinoLobby } from "@/components/casino/CasinoLobby";
import { isRouletteActive } from "@/lib/roulette";
import { isSlotsActive } from "@/lib/slots/spin-service";

export default async function CasinoPage() {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const [rouletteActive, slotsActive] = await Promise.all([
    isRouletteActive(),
    isSlotsActive(),
  ]);

  if (!rouletteActive && !slotsActive) {
    return (
      <div className="casino-lobby">
        <p className="admin-empty" style={{ padding: 24 }}>
          Casino cerrado temporalmente.
        </p>
      </div>
    );
  }

  return (
    <CasinoLobby
      balance={user.wallet?.balance ?? 0}
      rouletteActive={rouletteActive}
    />
  );
}
