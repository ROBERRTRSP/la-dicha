"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandHeader } from "@/components/player/BrandHeader";
import { CASINO_ART } from "@/lib/casino-art";
import { ART } from "@/lib/visual-assets";
import { SLOT_GAME_LIST } from "@/lib/slots/games";
import { formatMoney } from "@/lib/utils";

export function CasinoLobby({
  balance,
  rouletteActive,
  slotsActive = true,
}: {
  balance: number;
  rouletteActive: boolean;
  slotsActive?: boolean;
}) {
  return (
    <div className="casino-lobby">
      <div
        className="casino-lobby-bg"
        style={{ backgroundImage: `url(${CASINO_ART.lobbyBg})` }}
        aria-hidden
      />
      <BrandHeader balance={balance} title="Casino La Dicha" compact variant="casino" />

      <div className="casino-lobby-content">
        <p className="casino-lobby-welcome">
          Ruleta europea y tragamonedas premium
        </p>

        {rouletteActive && (
          <Link href="/ruleta/roulette" className="casino-game-card casino-game-card--roulette">
            <div className="casino-game-card-art">
              <Image
                src={ART.ruletaChip}
                alt=""
                width={120}
                height={120}
                className="casino-game-card-img"
              />
            </div>
            <div className="casino-game-card-body">
              <h2>Ruleta La Dicha</h2>
              <p>Ruleta europea en vivo · Apuestas desde {formatMoney(1)}</p>
              <span className="casino-game-card-cta">Entrar →</span>
            </div>
          </Link>
        )}

        {slotsActive && (
          <>
            <h3 className="casino-lobby-section">Tragamonedas 5×3</h3>
            <div className="casino-slot-grid">
              {SLOT_GAME_LIST.map((game) => (
                <Link
                  key={game.id}
                  href={`/ruleta/${game.id}`}
                  className={`casino-slot-tile ${game.themeClass}`}
                >
                  <div className="casino-slot-tile-media">
                    <Image
                      src={CASINO_ART.thumbs[game.id]}
                      alt=""
                      fill
                      sizes="(max-width: 480px) 50vw, 200px"
                      className="casino-slot-tile-img"
                    />
                    <span className="casino-slot-tile-badge">5×3</span>
                  </div>
                  <div className="casino-slot-tile-body">
                    <h2>{game.name}</h2>
                    <p>{game.tagline}</p>
                    <span className="casino-slot-tile-bonus">{game.bonus.description}</span>
                    <span className="casino-slot-tile-cta">Jugar →</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
