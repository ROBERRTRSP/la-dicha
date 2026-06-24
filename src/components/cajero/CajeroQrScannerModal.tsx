"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { parseTicketQrPayload } from "@/lib/ticket-codes";

const READER_ID = "cajero-ticket-qr-reader";

type QrScanner = {
  isScanning: boolean;
  start: (
    camera: string | { facingMode: string },
    config: Record<string, unknown>,
    onSuccess: (decoded: string) => void,
    onError: (msg: string) => void
  ) => Promise<unknown>;
  stop: () => Promise<void>;
  clear: () => void;
  scanFile: (file: File, showImage: boolean) => Promise<string>;
};

export function CajeroQrScannerModal({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (raw: string) => void;
}) {
  const fileInputId = useId().replace(/:/g, "");
  const scannerRef = useRef<QrScanner | null>(null);
  const handledRef = useRef(false);
  const cancelledRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const acceptDecode = useCallback((decoded: string) => {
    if (handledRef.current) return;
    const text = decoded.trim();
    if (!text) return;

    const parsed = parseTicketQrPayload(text);
    if (!parsed) {
      setError(`QR leído pero no es un ticket válido: ${text.slice(0, 40)}…`);
      return;
    }

    handledRef.current = true;
    onScanRef.current(text);
    onCloseRef.current();
  }, []);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      /* ya detenido */
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      setError("");
      setStarting(true);
      handledRef.current = false;

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelledRef.current) return;

        await stopScanner();

        const scanner = new Html5Qrcode(READER_ID, {
          verbose: false,
          useBarCodeDetectorIfSupported: false,
        }) as unknown as QrScanner;
        scannerRef.current = scanner;

        const config = {
          fps: 20,
          disableFlip: false,
          qrbox: (w: number, h: number) => {
            const edge = Math.floor(Math.min(w, h) * 0.92);
            return { width: edge, height: edge };
          },
        };

        if (deviceId) {
          await scanner.start(deviceId, config, acceptDecode, () => {});
        } else {
          await scanner.start(
            { facingMode: "environment" },
            config,
            acceptDecode,
            () => {}
          );
        }
      } catch (e) {
        if (!cancelledRef.current) {
          const msg =
            e instanceof Error ? e.message : "No se pudo abrir la cámara.";
          setError(`${msg} Use «Subir foto» si el ticket está en imagen.`);
        }
      } finally {
        if (!cancelledRef.current) setStarting(false);
      }
    },
    [acceptDecode, stopScanner]
  );

  useEffect(() => {
    if (!open) {
      cancelledRef.current = true;
      handledRef.current = false;
      void stopScanner();
      return;
    }

    cancelledRef.current = false;

    async function boot() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const devices = await Html5Qrcode.getCameras();
        if (cancelledRef.current) return;

        const list = devices.map((d) => ({
          id: d.id,
          label: d.label || `Cámara ${d.id.slice(0, 6)}`,
        }));
        setCameras(list);

        const back =
          list.find((c) => /back|rear|environment|trasera/i.test(c.label)) ??
          list[list.length - 1] ??
          list[0];

        await startCamera(back?.id);
      } catch {
        if (!cancelledRef.current) await startCamera();
      }
    }

    void boot();

    return () => {
      cancelledRef.current = true;
      void stopScanner();
    };
  }, [open, startCamera, stopScanner]);

  async function switchCamera() {
    if (cameras.length < 2) {
      setCameraIndex((i) => (i === 0 ? 1 : 0));
      await stopScanner();
      await startCamera();
      return;
    }
    const next = (cameraIndex + 1) % cameras.length;
    setCameraIndex(next);
    await stopScanner();
    await startCamera(cameras[next]?.id);
  }

  async function scanFromFile(file: File | null) {
    if (!file) return;
    setError("");
    setStarting(true);
    handledRef.current = false;

    try {
      await stopScanner();
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(READER_ID, {
        verbose: false,
      }) as unknown as QrScanner;
      const text = await scanner.scanFile(file, false);
      scanner.clear();
      acceptDecode(text);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se detectó QR en la imagen. Acérquese o use mejor luz."
      );
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="cajero-qr-scanner-backdrop"
      onClick={() => onCloseRef.current()}
      role="presentation"
    >
      <div
        className="cajero-qr-scanner"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="cajero-qr-scanner-title"
      >
        <header className="cajero-qr-scanner-head">
          <h2 id="cajero-qr-scanner-title">Leer QR del ticket</h2>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <p className="cajero-qr-scanner-hint">
          Apunte al QR del recibo. Si no enfoca, use «Subir foto» o acerque el
          papel con buena luz.
        </p>
        <div id={READER_ID} className="cajero-qr-scanner-view" />
        {starting && (
          <p className="cajero-qr-scanner-status">Preparando lector…</p>
        )}
        {error && <p className="staff-error">{error}</p>}
        <footer className="cajero-qr-scanner-foot">
          <label className="cajero-qr-scanner-file-btn">
            Subir foto
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              capture="environment"
              className="cajero-qr-scanner-file-input"
              onChange={(e) => void scanFromFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="staff-link-btn"
            onClick={() => void switchCamera()}
            disabled={starting}
          >
            Cambiar cámara
          </button>
          <button
            type="button"
            className="staff-link-btn"
            onClick={() => onCloseRef.current()}
          >
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  );
}
