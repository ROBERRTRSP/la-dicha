import Link from "next/link";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";
import { formatMoney } from "@/lib/utils";

export function BrandHeader({
  balance,
  userName,
  compact,
  title,
  backHref,
}: {
  balance?: number;
  userName?: string;
  compact?: boolean;
  title?: string;
  backHref?: string;
}) {
  if (compact || title) {
    return (
      <header className="play-header shrink-0 sticky top-0 z-30">
        {backHref ? (
          <Link href={backHref} className="play-header-back" aria-label="Volver">
            <span className="play-header-back-mark" aria-hidden />
          </Link>
        ) : (
          <AiVisual
            src={ART.logo}
            alt="La Dicha"
            width={32}
            height={32}
            className="rounded-lg shrink-0"
          />
        )}
        {title ? (
          <p className="font-bold text-[#1e3a5f] text-sm flex-1 min-w-0 truncate">
            {title}
          </p>
        ) : (
          <div className="flex-1 min-w-0" aria-hidden />
        )}
        {balance !== undefined && (
          <p className="font-bold text-[#0d9488] text-sm shrink-0 tabular-nums">
            {formatMoney(balance)}
          </p>
        )}
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AiVisual
            src={ART.logo}
            alt="La Dicha"
            width={44}
            height={44}
            className="rounded-xl shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-[#1e3a5f] text-base leading-tight">
              La Dicha
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Suerte clara. Jugada segura.
            </p>
          </div>
        </div>
        {balance !== undefined && (
          <div className="text-right shrink-0">
            <p className="text-[11px] text-slate-500">Saldo</p>
            <p className="font-bold text-[#0d9488] text-base">
              {formatMoney(balance)}
            </p>
          </div>
        )}
      </div>
      {userName && (
        <p className="text-xs text-slate-400 mt-1">Hola, {userName}</p>
      )}
    </header>
  );
}
