"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 60_000;

export function ResultsLiveSync({
  pendingToday,
}: {
  pendingToday: number;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);

  const sync = useCallback(async () => {
    if (busy.current || document.visibilityState !== "visible") return;
    busy.current = true;
    setSyncing(true);
    try {
      const res = await fetch("/api/results/sync", { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { updated?: number };
      const n = data.updated ?? 0;
      setLastUpdated(n);
      if (n > 0) router.refresh();
    } catch {
      /* reintenta en el próximo ciclo */
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    void sync();
    const id = window.setInterval(() => void sync(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  if (!syncing && pendingToday === 0 && lastUpdated === 0) return null;

  return (
    <p className="results-sync-hint" role="status" aria-live="polite">
      {syncing
        ? "Actualizando resultados…"
        : pendingToday > 0
          ? `Pendientes hoy: ${pendingToday} · se actualiza solo cada minuto`
          : lastUpdated > 0
            ? `${lastUpdated} resultado${lastUpdated !== 1 ? "s" : ""} nuevos`
            : null}
    </p>
  );
}
