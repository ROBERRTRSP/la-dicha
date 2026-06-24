import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { BrandHeader } from "@/components/player/BrandHeader";
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
        <div
          className="casino-lobby-bg"
          style={{ backgroundImage: "url(/casino/casino-lobby-bg.png)" }}
          aria-hidden
        />
        <BrandHeader
          balance={user.wallet?.balance ?? 0}
          title="Casino La Dicha"
          compact
          variant="casino"
        />
        <div className="casino-lobby-content">
          <p className="casino-lobby-closed">Casino cerrado temporalmente.</p>
        </div>
      </div>
    );
  }

  return (
    <CasinoLobby
      balance={user.wallet?.balance ?? 0}
      rouletteActive={rouletteActive}
      slotsActive={slotsActive}
    />
  );
}
