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
}: {
  balance: number;
  rouletteActive: boolean;
}) {
  return (
    <div className="casino-lobby">
      <div
        className="casino-lobby-bg"
        style={{ backgroundImage: `url(${CASINO_ART.lobbyBg})` }}
        aria-hidden
      />
      <BrandHeader balance={balance} title="Casino La Dicha" compact />

      <div className="casino-lobby-content">
        <p className="casino-lobby-welcome">
          Ruleta europea y tragamonedas premium · Saldo {formatMoney(balance)}
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

        <h3 className="casino-lobby-section">Tragamonedas 5×3</h3>
        <div className="casino-game-grid">
          {SLOT_GAME_LIST.map((game) => (
            <Link
              key={game.id}
              href={`/ruleta/${game.id}`}
              className={`casino-game-card casino-game-card--slot ${game.themeClass}`}
            >
              <div className="casino-game-card-thumb">
                <Image
                  src={CASINO_ART.thumbs[game.id]}
                  alt={game.name}
                  width={160}
                  height={160}
                  className="casino-game-card-img"
                />
              </div>
              <div className="casino-game-card-body">
                <h2>{game.name}</h2>
                <p>{game.tagline}</p>
                <span className="casino-game-card-bonus">{game.bonus.description}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
