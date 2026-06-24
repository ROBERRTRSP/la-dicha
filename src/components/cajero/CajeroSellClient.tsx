"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CajeroLotteryStrip } from "@/components/cajero/CajeroLotteryStrip";
import { CajeroVanqueroEntry } from "@/components/cajero/CajeroVanqueroEntry";
import { CajeroVanqueroCart } from "@/components/cajero/CajeroVanqueroCart";
import type { PlayLimitPanelState } from "@/components/cajero/CajeroPlayLimitPanel";
import { nextVanqueroSessionId } from "@/lib/cajero-vanquero-display";
import { CajeroSilentPrint } from "@/components/cajero/CajeroSilentPrint";
import { CajeroVanqueroMenu } from "@/components/cajero/CajeroVanqueroMenu";
import { CajeroDuplicateTicketModal } from "@/components/cajero/CajeroDuplicateTicketModal";
import { ConfirmModal } from "@/components/player/ConfirmModal";
import { formatMoney } from "@/lib/utils";
import { useCajeroNumpad } from "@/hooks/useCajeroNumpad";
import type { CajeroNumpadMode } from "@/lib/cajero-numpad";
import {
  appendJugadaChar,
  parseJugadaInput,
  shouldParseAsSuperPale,
  type ExpandedPlay,
} from "@/lib/cajero-bet-entry";
import type { OpenDrawView } from "@/lib/draws";
import { generateId } from "@/lib/generate-id";
import { cartLineTotal, type CartLine } from "@/lib/tickets";
import {
  buildPlayStripItems,
  isSuperPaleId,
  type OpenSuperPaleView,
} from "@/lib/super-pale";

import {
  playsToCartLines,
  selectedSuperIds,
} from "@/lib/cajero-cart-lines";
import {
  CAJERO_AMOUNT_EMPTY_ERROR,
  parseBetAmountDraft,
  validateBetAmountDraft,
} from "@/lib/cajero-bet-amount";
import { BET_AMOUNT_MIN } from "@/lib/cart-limits";

function withPreservedSupers(prev: Set<string>, drawIds: string[]) {
  const supers = selectedSuperIds(prev);
  return new Set([...drawIds, ...supers]);
}

export function CajeroSellClient({
  initialDraws,
  initialSuperPales = [],
}: {
  initialDraws: OpenDrawView[];
  initialSuperPales?: OpenSuperPaleView[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerInputRef = useRef<HTMLInputElement>(null);
  const lastSoldLinesRef = useRef<CartLine[]>([]);
  const sellingRef = useRef(false);

  const [draws, setDraws] = useState(initialDraws);
  const [openSuperPales, setOpenSuperPales] =
    useState<OpenSuperPaleView[]>(initialSuperPales);
  const [customerName, setCustomerName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lotteryIndex, setLotteryIndex] = useState(0);
  const [jugadaInput, setJugadaInput] = useState("");
  const [pendingPlays, setPendingPlays] = useState<ExpandedPlay[]>([]);
  const [inputMode, setInputMode] = useState<CajeroNumpadMode>("numbers");
  const [amountDraft, setAmountDraft] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);
  const [loading, setLoading] = useState(false);
  const [multiLot, setMultiLot] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicatePrefill, setDuplicatePrefill] = useState("");
  const [sessionId, setSessionId] = useState(() => nextVanqueroSessionId());
  const [dayPlays, setDayPlays] = useState(0);
  const [daySales, setDaySales] = useState(0);
  const [bancaBalance, setBancaBalance] = useState<number | null>(null);
  const [bancaName, setBancaName] = useState("ELITE 13");
  const [limitPanel, setLimitPanel] = useState<PlayLimitPanelState>({
    visible: false,
    items: [],
  });
  const [printJob, setPrintJob] = useState<{
    ticket: {
      ticketNumber: string;
      internalTicketCode?: string | null;
      verificationCode: string;
      totalAmount: number;
      customerName?: string | null;
      createdAt: string;
      items: {
        betType: string;
        numbers: string;
        lotteryName: string;
        amount: number;
        drawTime?: string;
        drawDate?: string;
        superPaleName?: string | null;
      }[];
    };
    qrDataUrl: string;
  } | null>(null);

  const lotteryIds = useMemo(() => {
    const items = buildPlayStripItems(draws, openSuperPales);
    return items.map((item) =>
      item.kind === "draw" ? item.draw.id : item.superPale.id
    );
  }, [draws, openSuperPales]);

  const focusLotteryId = lotteryIds[lotteryIndex] ?? null;

  const selectedDrawCount = useMemo(
    () => draws.filter((d) => selected.has(d.id)).length,
    [draws, selected]
  );
  const selectedSuperCount = useMemo(
    () => selectedSuperIds(selected).length,
    [selected]
  );

  const parseAsSuperPale = useMemo(
    () =>
      shouldParseAsSuperPale({
        focusId: focusLotteryId,
        selectedSuperCount,
        selectedDrawCount,
      }),
    [focusLotteryId, selectedSuperCount, selectedDrawCount]
  );

  const refreshDraws = useCallback(async () => {
    try {
      const res = await fetch("/api/cajero/draws");
      if (res.ok) {
        const data = await res.json();
        setDraws(data.draws ?? []);
        setOpenSuperPales(data.superPales ?? []);
        setSelected((prev) => {
          const drawIds = new Set(
            (data.draws as OpenDrawView[] | undefined)?.map((d) => d.id) ?? []
          );
          const superIds = new Set(
            (data.superPales as OpenSuperPaleView[] | undefined)?.map(
              (s) => s.id
            ) ?? []
          );
          return new Set(
            [...prev].filter((id) => drawIds.has(id) || superIds.has(id))
          );
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const refreshDayStats = useCallback(async () => {
    try {
      const res = await fetch("/api/cajero/dashboard", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setDayPlays(data.cashSales?.playsCount ?? 0);
      setDaySales(data.cashSales?.total ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshBanca = useCallback(async () => {
    try {
      const res = await fetch("/api/cajero/banca", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setBancaBalance(data.currentBalance ?? null);
      setBancaName(data.settings?.bancaName ?? "ELITE 13");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const dup = searchParams.get("dup")?.trim();
    if (dup) {
      setDuplicatePrefill(dup);
      setDuplicateOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    refreshDraws();
    refreshDayStats();
    refreshBanca();
    const t = setInterval(refreshDraws, 15000);
    const s = setInterval(refreshDayStats, 30000);
    return () => {
      clearInterval(t);
      clearInterval(s);
    };
  }, [refreshDraws, refreshDayStats, refreshBanca]);

  useEffect(() => {
    if (lotteryIds.length === 0) {
      setSelected(new Set());
      return;
    }
    const idx = Math.min(lotteryIndex, lotteryIds.length - 1);
    if (idx !== lotteryIndex) setLotteryIndex(idx);

    setSelected((prev) => {
      const valid = [...prev].filter((id) => lotteryIds.includes(id));
      const validSupers = valid.filter(isSuperPaleId);
      if (!multiLot) {
        const focusId = lotteryIds[idx];
        if (isSuperPaleId(focusId)) {
          const prevDraws = [...prev].filter(
            (id) => !isSuperPaleId(id) && lotteryIds.includes(id)
          );
          const next = new Set([
            ...selectedSuperIds(prev),
            focusId,
            ...(prevDraws[0] ? [prevDraws[0]] : []),
          ]);
          if (
            next.size === prev.size &&
            [...next].every((id) => prev.has(id))
          ) {
            return prev;
          }
          return next;
        }
        const next = withPreservedSupers(prev, [focusId]);
        const prevDraws = [...prev].filter(
          (id) => !isSuperPaleId(id) && lotteryIds.includes(id)
        );
        if (
          prevDraws.length === 1 &&
          prevDraws[0] === focusId &&
          validSupers.length === selectedSuperIds(prev).length &&
          validSupers.every((id) => prev.has(id))
        ) {
          return prev;
        }
        return next;
      }
      if (valid.length > 0) {
        const next = new Set(valid);
        return next.size === prev.size ? prev : next;
      }
      return new Set([lotteryIds[idx]]);
    });
  }, [lotteryIds, lotteryIndex, multiLot]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(""), 5000);
    return () => clearTimeout(t);
  }, [info]);

  useEffect(() => {
    const controller = new AbortController();
    const betAmount = parseBetAmountDraft(amountDraft) ?? 0;
    const hasJugada = jugadaInput.trim().length > 0 || pendingPlays.length > 0;
    const hasAmount = betAmount > 0;
    const hasSelection = selected.size > 0;

    if (!hasSelection) {
      setLimitPanel({ visible: false, items: [] });
      return () => controller.abort();
    }

    if (!hasJugada && hasAmount) {
      setLimitPanel({
        visible: true,
        waitingForNumber: true,
        waitingForAmount: false,
        amount: betAmount,
        items: [],
        canPlay: true,
        loading: false,
      });
      return () => controller.abort();
    }

    if (!hasJugada) {
      setLimitPanel({ visible: false, items: [] });
      return () => controller.abort();
    }

    const timer = setTimeout(() => {
      void (async () => {
        setLimitPanel((prev) => ({
          ...prev,
          loading: true,
          waitingForNumber: false,
          waitingForAmount: !hasAmount,
        }));
        try {
          const res = await fetch("/api/cajero/play-limit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: controller.signal,
            body: JSON.stringify({
              jugadaInput,
              pendingPlays: pendingPlays.length > 0 ? pendingPlays : undefined,
              amount: betAmount,
              selectedIds: [...selected],
              isSuperPale: parseAsSuperPale,
              cart,
            }),
          });
          if (!res.ok) {
            setLimitPanel({ visible: false, items: [] });
            return;
          }
          const data = await res.json();
          const items = data.items ?? [];
          const canPlay =
            !hasAmount
              ? true
              : items.length === 0
                ? true
                : items.every(
                    (i: { available: number }) => betAmount <= i.available + 1e-9
                  );
          setLimitPanel({
            visible: data.visible === true,
            loading: false,
            waitingForNumber: false,
            waitingForAmount: !hasAmount,
            number: data.number,
            playTypeLabel: data.playTypeLabel,
            amount: betAmount,
            items,
            canPlay,
          });
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setLimitPanel({ visible: false, items: [], loading: false });
        }
      })();
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    jugadaInput,
    pendingPlays,
    selected,
    amountDraft,
    cart,
    parseAsSuperPale,
  ]);

  const pendingBetAmount = parseBetAmountDraft(amountDraft) ?? 0;
  const hasPendingEntry =
    jugadaInput.trim().length > 0 || pendingPlays.length > 0;
  const hasValidPendingAmount = parseBetAmountDraft(amountDraft) !== null;
  const pendingLimitBlocked =
    hasPendingEntry &&
    hasValidPendingAmount &&
    limitPanel.visible &&
    !limitPanel.loading &&
    !limitPanel.waitingForNumber &&
    !limitPanel.waitingForAmount &&
    limitPanel.canPlay === false;
  const pendingAmountMissing =
    hasPendingEntry && !hasValidPendingAmount;
  const checkoutBlocked = pendingLimitBlocked;

  const total = useMemo(
    () => cart.reduce((s, l) => s + cartLineTotal(l), 0),
    [cart]
  );

  const selectLotteryByIndex = useCallback(
    (index: number) => {
      if (lotteryIds.length === 0) return;
      const next =
        ((index % lotteryIds.length) + lotteryIds.length) % lotteryIds.length;
      setLotteryIndex(next);
      if (!multiLot) {
        const id = lotteryIds[next];
        setSelected((prev) => {
          if (isSuperPaleId(id)) {
            const prevDraws = [...prev].filter(
              (x) => !isSuperPaleId(x) && lotteryIds.includes(x)
            );
            return new Set([
              ...selectedSuperIds(prev),
              id,
              ...(prevDraws[0] ? [prevDraws[0]] : []),
            ]);
          }
          return withPreservedSupers(prev, [id]);
        });
      }
      setError("");
    },
    [lotteryIds, multiLot]
  );

  const setSingleLotMode = useCallback(() => {
    setMultiLot(false);
    const fid = lotteryIds[lotteryIndex];
    if (fid) {
      setSelected((prev) => {
        if (isSuperPaleId(fid)) {
          const prevDraws = [...prev].filter(
            (id) => !isSuperPaleId(id) && lotteryIds.includes(id)
          );
          return new Set([
            ...selectedSuperIds(prev),
            fid,
            ...(prevDraws[0] ? [prevDraws[0]] : []),
          ]);
        }
        return withPreservedSupers(prev, [fid]);
      });
    }
    setInfo(
      "Modo 1 lotería — loterías y Súper Palé pueden quedar seleccionados a la vez."
    );
    setError("");
  }, [lotteryIds, lotteryIndex]);

  const setMultiLotMode = useCallback(() => {
    setMultiLot(true);
    setSelected((prev) => {
      const supers = selectedSuperIds(prev).filter((id) =>
        lotteryIds.includes(id)
      );
      const valid = [...prev].filter(
        (id) => lotteryIds.includes(id) && !isSuperPaleId(id)
      );
      if (valid.length > 0) return new Set([...valid, ...supers]);
      const fid = lotteryIds[lotteryIndex];
      return fid ? new Set([fid, ...supers]) : new Set(supers);
    });
    setInfo(
      "Modo varias — clic en loterías y Súper Palé para agregar o quitar."
    );
    setError("");
  }, [lotteryIds, lotteryIndex]);

  const resetJugada = useCallback(() => {
    setJugadaInput("");
    setPendingPlays([]);
    setInputMode("numbers");
  }, []);

  /** Limpia jugada y monto (cancelar ticket, reinicio completo). */
  const resetEntry = useCallback(() => {
    resetJugada();
    setAmountDraft("");
  }, [resetJugada]);

  const newSession = useCallback(() => {
    setSessionId(nextVanqueroSessionId());
  }, []);

  const cancelTicket = useCallback(() => {
    setCart([]);
    resetEntry();
    newSession();
    setError("");
    setInfo("Ticket cancelado (L).");
  }, [resetEntry, newSession]);

  const buildPendingFromInput = useCallback(() => {
    if (pendingPlays.length > 0) return pendingPlays;
    const parsed = parseJugadaInput(jugadaInput, {
      isSuperPale: parseAsSuperPale,
    });
    if (!parsed.ok) {
      setError(parsed.error);
      return null;
    }
    setPendingPlays(parsed.plays);
    return parsed.plays;
  }, [jugadaInput, parseAsSuperPale, pendingPlays]);

  const addPlaysToCart = useCallback(
    async (plays: ExpandedPlay[], betAmount: number) => {
      const selectedSuper = selectedSuperIds(selected);
      const selectedDrawCount = draws.filter((d) => selected.has(d.id)).length;
      for (const play of plays) {
        if (play.betType === "SUPER_PALE" && selectedSuper.length === 0) {
          setError("Selecciona al menos un Súper Palé (clic en el chip).");
          return false;
        }
        if (play.betType === "PALE") {
          if (selectedDrawCount === 0 && selectedSuper.length === 0) {
            setError("Selecciona lotería o Súper Palé para el palé.");
            return false;
          }
          continue;
        }
        if (play.betType !== "SUPER_PALE" && selectedDrawCount === 0) {
          setError("Selecciona al menos una lotería (clic o / -).");
          return false;
        }
      }
      if (!Number.isFinite(betAmount) || betAmount < BET_AMOUNT_MIN) {
        setError(
          betAmount <= 0
            ? CAJERO_AMOUNT_EMPTY_ERROR
            : `El monto mínimo por jugada es ${formatMoney(BET_AMOUNT_MIN)}.`
        );
        return false;
      }

      if (
        limitPanel.visible &&
        !limitPanel.loading &&
        !limitPanel.waitingForNumber &&
        !limitPanel.waitingForAmount &&
        limitPanel.canPlay === false
      ) {
        const blocked = limitPanel.items.find((i) => betAmount > i.available);
        setError(
          blocked?.message ??
            `El monto ${formatMoney(betAmount)} excede el límite disponible.`
        );
        return false;
      }

      try {
        const lines = playsToCartLines(
          plays,
          betAmount,
          selected,
          draws,
          openSuperPales
        );

        const limitRes = await fetch("/api/cajero/play-limit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mode: "validate",
            pendingLines: lines,
            cart,
          }),
        });
        const validation = limitRes.ok
          ? await limitRes.json()
          : { ok: false, blockMessage: "No se pudo validar el límite." };
        if (!validation.ok) {
          setError(
            validation.blockMessage ??
              "El monto excede el límite disponible para este número."
          );
          return false;
        }

        setCart((prev) => [...prev, ...lines]);
        resetJugada();
        setAddedFlash(true);
        setTimeout(() => setAddedFlash(false), 1500);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error en jugada.");
        return false;
      }
    },
    [selected, draws, openSuperPales, cart, resetJugada, limitPanel]
  );

  const onEnterStep = useCallback(() => {
    setError("");
    const amountCheck = validateBetAmountDraft(amountDraft);

    if (inputMode === "amount") {
      if (!jugadaInput && pendingPlays.length === 0) {
        if (amountCheck.ok) {
          setInputMode("numbers");
          setInfo("Ingrese la jugada (número).");
          return;
        }
        setError(amountCheck.error);
        return;
      }

      if (!amountCheck.ok) {
        setError(amountCheck.error);
        return;
      }

      const betAmount = amountCheck.amount;

      if (pendingLimitBlocked) {
        const blocked = limitPanel.items.find(
          (i) => betAmount > i.available
        );
        setError(
          blocked?.message ??
            `El monto ${formatMoney(betAmount)} excede el límite disponible.`
        );
        return;
      }

      const plays = pendingPlays.length
        ? pendingPlays
        : buildPendingFromInput();
      if (!plays?.length) return;
      void addPlaysToCart(plays, betAmount);
      return;
    }

    if (!jugadaInput.trim() && pendingPlays.length === 0) {
      if (amountCheck.ok) {
        setInfo("Ingrese el número de la jugada.");
        return;
      }
      setInputMode("amount");
      setInfo("Ingrese el monto y luego el número.");
      return;
    }

    const plays = buildPendingFromInput();
    if (!plays?.length) return;

    if (amountCheck.ok) {
      const betAmount = amountCheck.amount;
      if (pendingLimitBlocked) {
        const blocked = limitPanel.items.find(
          (i) => betAmount > i.available
        );
        setError(
          blocked?.message ??
            `El monto ${formatMoney(betAmount)} excede el límite disponible.`
        );
        return;
      }
      void addPlaysToCart(plays, betAmount);
      return;
    }

    setInputMode("amount");
    setInfo(
      plays.length > 1
        ? `${plays.length} combinaciones — ingrese monto y Enter.`
        : "Ingrese monto y Enter."
    );
  }, [
    inputMode,
    amountDraft,
    jugadaInput,
    pendingPlays,
    buildPendingFromInput,
    addPlaysToCart,
    pendingLimitBlocked,
    limitPanel.items,
  ]);

  const buildLinesForSale = useCallback(() => {
    const betAmount = parseBetAmountDraft(amountDraft);
    let lines = [...cart];

    if (jugadaInput || pendingPlays.length) {
      if (betAmount === null) {
        return lines;
      }
      const plays =
        pendingPlays.length > 0
          ? pendingPlays
          : (() => {
              const p = parseJugadaInput(jugadaInput, {
                isSuperPale: parseAsSuperPale,
              });
              return p.ok ? p.plays : [];
            })();
      if (plays.length) {
        try {
          const extra = playsToCartLines(
            plays,
            betAmount,
            selected,
            draws,
            openSuperPales
          );
          lines = [...lines, ...extra];
        } catch {
          /* ignore pending */
        }
      }
    }
    return lines;
  }, [
    cart,
    jugadaInput,
    pendingPlays,
    amountDraft,
    selected,
    draws,
    openSuperPales,
    parseAsSuperPale,
  ]);

  const executeSale = useCallback(
    async (lines: CartLine[], confirmWarnings = false) => {
      if (lines.length === 0 || sellingRef.current) return;
      sellingRef.current = true;
      setLoading(true);
      setError("");
      try {
        let confirmed = confirmWarnings;
        while (true) {
          const res = await fetch("/api/cajero/sell", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ lines, customerName, confirmWarnings: confirmed }),
          });
          const data = await res.json();
          if (res.status === 409 && data.requireConfirm && !confirmed) {
            const warnings = (data.warnings as string[] | undefined) ?? [];
            const ok = window.confirm(
              `${warnings.join("\n")}\n\n¿Continuar con la venta?`
            );
            if (!ok) {
              setError("Venta cancelada.");
              return;
            }
            confirmed = true;
            continue;
          }
          if (!res.ok) throw new Error(data.error ?? "Error al vender.");
          lastSoldLinesRef.current = lines.map((l) => ({ ...l, id: generateId() }));
          setPrintJob({ ticket: data.ticket, qrDataUrl: data.qrDataUrl });
          setInfo(
            `Vendido ${data.ticket.ticketNumber} · ${formatMoney(data.ticket.totalAmount)}`
          );
          setCart([]);
          setConfirmOpen(false);
          resetJugada();
          newSession();
          void refreshDayStats();
          void refreshBanca();
          break;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al vender.");
      } finally {
        sellingRef.current = false;
        setLoading(false);
      }
    },
    [customerName, resetJugada, newSession, refreshDayStats, refreshBanca]
  );

  const sellAndPrint = useCallback(() => {
    if (pendingLimitBlocked) {
      const blocked = limitPanel.items.find(
        (i) => pendingBetAmount > i.available
      );
      setError(
        blocked?.message ??
          "La jugada en curso excede el límite. Reduzca el monto o cambie número/lotería."
      );
      return;
    }

    let lines: CartLine[];
    if (pendingAmountMissing) {
      if (cart.length === 0) {
        const amountCheck = validateBetAmountDraft(amountDraft);
        setError(amountCheck.ok ? CAJERO_AMOUNT_EMPTY_ERROR : amountCheck.error);
        setInputMode("amount");
        return;
      }
      resetJugada();
      setInfo("Jugada en curso descartada — imprimiendo ticket.");
      lines = cart;
    } else {
      lines = buildLinesForSale();
    }

    if (lines.length === 0) {
      setError("Sin jugadas en el ticket. Número + Enter (monto se mantiene) → * imprimir.");
      return;
    }
    void executeSale(lines);
  }, [
    buildLinesForSale,
    executeSale,
    pendingLimitBlocked,
    pendingAmountMissing,
    amountDraft,
    cart,
    resetJugada,
    limitPanel.items,
    pendingBetAmount,
  ]);

  const duplicateTicket = useCallback(() => {
    if (lastSoldLinesRef.current.length === 0) {
      setDuplicateOpen(true);
      setInfo("Ingrese número de ticket a duplicar.");
      return;
    }
    const copies = lastSoldLinesRef.current.map((l) => ({
      ...l,
      id: generateId(),
      addedAt: Date.now(),
    }));
    setCart((prev) => [...prev, ...copies]);
    setInfo(`Duplicado último ticket: ${copies.length} jugadas (c).`);
  }, []);

  const onAppend = useCallback(
    (ch: string) => {
      setError("");
      if (inputMode === "amount") {
        if (ch >= "0" && ch <= "9") {
          if (amountDraft.length >= 6) {
            setError("Monto máximo 6 dígitos.");
            return;
          }
          setAmountDraft((prev) => prev + ch);
        }
        return;
      }
      const next = appendJugadaChar(jugadaInput, ch);
      if (next === null) {
        setError("Jugada completa. Presione Enter.");
        return;
      }
      setJugadaInput(next);
      setPendingPlays([]);
    },
    [inputMode, amountDraft.length, jugadaInput]
  );

  const onBackspace = useCallback(() => {
    setError("");
    if (inputMode === "amount") {
      if (amountDraft.length === 0) {
        setInputMode("numbers");
        return;
      }
      setAmountDraft((prev) => prev.slice(0, -1));
      return;
    }
    setJugadaInput((prev) => prev.slice(0, -1));
    setPendingPlays([]);
  }, [inputMode, amountDraft]);

  const focusJugada = useCallback(() => {
    setInputMode("numbers");
    setError("");
  }, []);

  const focusAmount = useCallback(() => {
    setInputMode("amount");
    setError("");
    setInfo("Modo monto — escriba el valor y Enter para pasar a jugada.");
  }, []);

  const { captureRef, refocusCapture } = useCajeroNumpad({
    enabled: !printJob,
    confirmOpen,
    mode: inputMode,
    jugadaBuffer: jugadaInput,
    amountBuffer: amountDraft,
    onAppend,
    onBackspace,
    onArrowClear: resetEntry,
    onCancelTicket: cancelTicket,
    onNextLottery: () => selectLotteryByIndex(lotteryIndex + 1),
    onPrevLottery: () => selectLotteryByIndex(lotteryIndex - 1),
    onEnterStep,
    onSellPrint: sellAndPrint,
    onDuplicateTicket: duplicateTicket,
    onMarkPaid: () => router.push("/cajero/tickets?focus=pending"),
    onConfirm: () => {
      if (!loading) void executeSale(cart);
    },
    onCancelConfirm: () => setConfirmOpen(false),
    customerInputRef,
  });

  const addDuplicatedLines = useCallback(
    (lines: CartLine[], ticketNumber: string, warning?: string) => {
      const copies = lines.map((l) => ({
        ...l,
        id: generateId(),
        addedAt: Date.now(),
      }));

      setCart((prev) => [...prev, ...copies]);
      setError("");
      setInfo(
        warning ??
          `Duplicado ${ticketNumber}: ${copies.length} jugada(s) al carrito.`
      );
      setTimeout(() => refocusCapture(), 50);
    },
    [refocusCapture]
  );

  const selectAllLotteries = useCallback(() => {
    const ids = lotteryIds.filter((id) => !isSuperPaleId(id));
    if (ids.length === 0) {
      setError("No hay loterías para seleccionar.");
      return;
    }
    setMultiLot(true);
    setSelected((prev) => new Set([...ids, ...selectedSuperIds(prev)]));
    setInfo(`${ids.length} loterías seleccionadas.`);
    setError("");
  }, [lotteryIds]);

  const clearLotteries = useCallback(() => {
    const fid = lotteryIds[lotteryIndex];
    if (fid && !isSuperPaleId(fid)) {
      setSelected((prev) => withPreservedSupers(prev, [fid]));
      setInfo("Solo lotería en foco (Súper Palé se mantiene).");
    } else {
      setSelected((prev) => new Set(selectedSuperIds(prev)));
      setInfo("Loterías limpiadas (Súper Palé se mantiene).");
    }
    setError("");
  }, [lotteryIds, lotteryIndex]);

  const handleLotToggle = useCallback(
    (id: string) => {
      const idx = lotteryIds.indexOf(id);
      if (idx >= 0) setLotteryIndex(idx);

      if (isSuperPaleId(id)) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        setError("");
        return;
      }

      if (multiLot) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            const drawCount = [...next].filter((x) => !isSuperPaleId(x)).length;
            if (drawCount > 1) next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
        setError("");
        return;
      }

      setSelected((prev) => withPreservedSupers(prev, [id]));
      setError("");
    },
    [lotteryIds, multiLot]
  );

  return (
    <div className="cajero-sell cajero-sell--vanquero">
      <div className="cajero-vq-body">
      <CajeroVanqueroEntry
        jugadaInput={jugadaInput}
        pendingCount={pendingPlays.length}
        inputMode={inputMode}
        amountDraft={amountDraft}
        sessionId={sessionId}
        cartTotal={total}
        cartCount={cart.length}
        dayPlays={dayPlays}
        daySales={daySales}
        bancaBalance={bancaBalance}
        bancaName={bancaName}
        multiLot={multiLot}
        onToggleMultiLot={() =>
          multiLot ? setSingleLotMode() : setMultiLotMode()
        }
        captureRef={captureRef}
        onCaptureClick={refocusCapture}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        customerInputRef={customerInputRef}
        limitPanel={limitPanel}
        entryBlocked={pendingLimitBlocked}
        onFocusJugada={focusJugada}
        onFocusAmount={focusAmount}
        afterClock={
          <CajeroLotteryStrip
            draws={draws}
            superPales={openSuperPales}
            selected={selected}
            focusId={focusLotteryId}
            multiLot={multiLot}
            onToggle={handleLotToggle}
            onSelectAll={selectAllLotteries}
            onClear={clearLotteries}
            onSetSingleLot={setSingleLotMode}
            onSetMultiLot={setMultiLotMode}
          />
        }
      />

      <CajeroVanqueroCart
        lines={cart}
        loading={loading}
        checkoutDisabled={checkoutBlocked}
        checkoutBlockReason={
          pendingLimitBlocked
            ? "La jugada en curso excede el límite disponible"
            : undefined
        }
        onRemove={(id) => setCart((c) => c.filter((l) => l.id !== id))}
        onCheckout={sellAndPrint}
      />
      </div>

      <CajeroVanqueroMenu
        draws={draws}
        dayPlays={dayPlays}
        daySales={daySales}
        cartCount={cart.length}
        cartTotal={total}
        onDuplicate={() => setDuplicateOpen(true)}
        onFocusJugadas={() => {
          resetJugada();
          setTimeout(() => refocusCapture(), 50);
          setInfo("Ingrese la jugada (el monto se mantiene).");
        }}
        onBancaChange={() => {
          void refreshBanca();
          void refreshDayStats();
        }}
      />

      <CajeroDuplicateTicketModal
        open={duplicateOpen}
        onClose={() => {
          setDuplicateOpen(false);
          setDuplicatePrefill("");
        }}
        onAddLines={addDuplicatedLines}
        initialTicketNumber={duplicatePrefill}
        cart={cart}
      />

      {addedFlash && (
        <div className="cajero-sell-toast">Jugada agregada — * imprimir</div>
      )}
      {info && <div className="cajero-sell-info">{info}</div>}
      {error && <div className="cajero-sell-error">{error}</div>}

      <ConfirmModal
        open={confirmOpen}
        lines={cart}
        total={total}
        balanceBefore={0}
        balanceAfter={0}
        loading={loading}
        onConfirm={() => void executeSale(cart)}
        onClose={() => {
          setConfirmOpen(false);
          setTimeout(() => refocusCapture(), 100);
        }}
        cashSale
        customerName={customerName}
      />

      {printJob && (
        <CajeroSilentPrint
          ticket={printJob.ticket}
          qrDataUrl={printJob.qrDataUrl}
          onDone={() => {
            setPrintJob(null);
            setTimeout(() => refocusCapture(), 100);
          }}
        />
      )}
    </div>
  );
}
