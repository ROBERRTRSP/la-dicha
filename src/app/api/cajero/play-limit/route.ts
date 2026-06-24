import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import {
  validatePlayLimitsForCart,
} from "@/lib/banca-session";
import { loadPlayLimitContext } from "@/lib/play-limit-context";
import {
  detectBetType,
  formatNumbers,
  type BetTypeCode,
} from "@/lib/bet-parser";
import { parseJugadaInput } from "@/lib/cajero-bet-entry";
import type { OpenDrawView } from "@/lib/draws";
import {
  buildPlayLimitPreview,
  buildSoldAmountMap,
  fetchTodaySoldPlayItems,
  type PlayLimitBetType,
  type PlayLimitInfo,
} from "@/lib/play-limits";
import type { CartLine } from "@/lib/cart-line";
import type { OpenSuperPaleView } from "@/lib/super-pale";

type PreviewBody = {
  mode?: "preview" | "validate";
  jugadaInput?: string;
  pendingPlays?: {
    betType: BetTypeCode;
    digits: string;
    numbers: string;
  }[];
  amount?: number;
  selectedIds?: string[];
  isSuperPale?: boolean;
  cart?: CartLine[];
  pendingLines?: CartLine[];
};

function parseCartLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (line): line is CartLine =>
      line != null &&
      typeof line === "object" &&
      typeof (line as CartLine).betType === "string" &&
      Array.isArray((line as CartLine).drawIds)
  );
}

function resolveTargets(
  selectedIds: string[],
  draws: OpenDrawView[],
  superPales: OpenSuperPaleView[],
  betType: PlayLimitBetType,
  parseAsSuperPale: boolean
) {
  const selectedDraws = draws.filter((d) => selectedIds.includes(d.id));
  const selectedSuper = superPales.filter((s) => selectedIds.includes(s.id));

  if (betType === "SUPER_PALE" || parseAsSuperPale) {
    return selectedSuper.map((sp) => ({
      drawId: sp.drawIdA,
      lotteryId: sp.code,
      lotteryName: sp.name,
      superPaleCode: sp.code,
    }));
  }

  if (betType === "PALE" && selectedSuper.length > 0) {
    return [
      ...selectedDraws.map((d) => ({
        drawId: d.id,
        lotteryId: d.lotteryCode,
        lotteryName: d.lotteryName,
      })),
      ...selectedSuper.map((sp) => ({
        drawId: sp.drawIdA,
        lotteryId: sp.code,
        lotteryName: sp.name,
        superPaleCode: sp.code,
      })),
    ];
  }

  return selectedDraws.map((d) => ({
    drawId: d.id,
    lotteryId: d.lotteryCode,
    lotteryName: d.lotteryName,
  }));
}

export async function POST(req: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: PreviewBody;
  try {
    body = (await req.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { getCajeroSellDraws } = await import("@/lib/draws");
  const { draws, superPales } = await getCajeroSellDraws();
  const limitCtx = await loadPlayLimitContext();
  const cart = parseCartLines(body.cart);
  const amount = Number(body.amount ?? 0);
  const selectedIds = Array.isArray(body.selectedIds) ? body.selectedIds : [];

  if (body.mode === "validate") {
    const pendingLines = parseCartLines(body.pendingLines);
    if (pendingLines.length === 0) {
      return NextResponse.json({ error: "Sin jugadas para validar." }, { status: 400 });
    }
    const validation = await validatePlayLimitsForCart(pendingLines, cart);
    return NextResponse.json(validation);
  }

  let plays = body.pendingPlays ?? [];
  if (plays.length === 0 && body.jugadaInput?.trim()) {
    const parsed = parseJugadaInput(body.jugadaInput, {
      isSuperPale: body.isSuperPale === true,
    });
    if (parsed.ok) {
      plays = parsed.plays;
    } else {
      const digits = body.jugadaInput.replace(/\D/g, "");
      const partialType = detectBetType(digits);
      if (partialType && [2, 4, 6].includes(digits.length)) {
        let betType = partialType;
        if (body.isSuperPale && digits.length === 4) {
          betType = "SUPER_PALE";
        }
        plays = [
          {
            betType,
            digits,
            numbers:
              betType === "QUINIELA"
                ? digits.padStart(2, "0").slice(-2)
                : formatNumbers(digits, betType === "SUPER_PALE" ? "SUPER_PALE" : betType),
          },
        ];
      } else {
        return NextResponse.json({
          items: [] as PlayLimitInfo[],
          visible: false,
          message: parsed.error,
        });
      }
    }
  }

  if (plays.length === 0) {
    return NextResponse.json({ items: [], visible: false });
  }

  const primary = plays[0];
  let betType = primary.betType as PlayLimitBetType;
  if (body.isSuperPale && primary.digits.length === 4) {
    betType = "SUPER_PALE";
  }

  const drawIds = [
    ...new Set([
      ...draws.filter((d) => selectedIds.includes(d.id)).map((d) => d.id),
      ...superPales
        .filter((s) => selectedIds.includes(s.id))
        .flatMap((s) => [s.drawIdA, s.drawIdB]),
    ]),
  ];

  const soldItems = await fetchTodaySoldPlayItems(undefined, drawIds);
  const soldMap = buildSoldAmountMap(soldItems, cart);

  const allItems: PlayLimitInfo[] = [];

  for (const play of plays) {
    let playType = play.betType as PlayLimitBetType;
    if (body.isSuperPale && play.digits.length === 4) {
      playType = "SUPER_PALE";
    }

    const targets = resolveTargets(
      selectedIds,
      draws,
      superPales,
      playType,
      body.isSuperPale === true
    );

    if (targets.length === 0) {
      continue;
    }

    const preview = buildPlayLimitPreview(
      playType,
      play.numbers,
      amount > 0 ? amount : 0,
      targets,
      limitCtx,
      soldMap
    );
    allItems.push(...preview);
  }

  if (allItems.length === 0) {
    return NextResponse.json({ items: [], visible: false });
  }

  return NextResponse.json({
    visible: true,
    number: primary.numbers,
    playType: betType,
    playTypeLabel:
      betType === "QUINIELA"
        ? "Directo"
        : betType === "PALE"
          ? "Palé"
          : betType === "TRIPLETA"
            ? "Tripleta"
            : "Súper Palé",
    amount,
    items: allItems,
    canPlay: allItems.every((item) => item.canPlay || amount <= 0),
    worstAvailable: Math.min(...allItems.map((i) => i.available)),
  });
}

export async function GET(req: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const digits = (url.searchParams.get("number") ?? "").replace(/\D/g, "");
  const drawId = url.searchParams.get("drawId") ?? "";
  const amount = Number(url.searchParams.get("amount") ?? 0);
  const betTypeParam = url.searchParams.get("playType") ?? "";

  const detected = detectBetType(digits);
  const betType = (betTypeParam || detected) as PlayLimitBetType | null;
  if (!betType || !digits) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const limitCtx = await loadPlayLimitContext();
  const numbers =
    betType === "QUINIELA"
      ? digits.padStart(2, "0").slice(-2)
      : formatNumbers(digits, betType);

  const soldItems = await fetchTodaySoldPlayItems(
    undefined,
    drawId ? [drawId] : undefined
  );
  const soldMap = buildSoldAmountMap(soldItems);

  const { getCajeroSellDraws } = await import("@/lib/draws");
  const { draws } = await getCajeroSellDraws();
  const draw = draws.find((d) => d.id === drawId);

  const items = buildPlayLimitPreview(
    betType,
    numbers,
    amount,
    draw
      ? [
          {
            drawId: draw.id,
            lotteryId: draw.lotteryCode,
            lotteryName: draw.lotteryName,
          },
        ]
      : [],
    limitCtx,
    soldMap
  );

  const item = items[0];
  if (!item) {
    return NextResponse.json({ error: "Sin datos de límite" }, { status: 404 });
  }

  return NextResponse.json({
    number: item.number,
    lotteryId: item.lotteryId,
    playType: item.playType,
    limit: item.limit,
    sold: item.sold,
    available: item.available,
    canPlay: item.canPlay,
    message: item.message,
  });
}
