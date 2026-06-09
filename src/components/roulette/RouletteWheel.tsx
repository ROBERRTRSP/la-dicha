"use client";

import { useEffect, useRef, useState } from "react";
import { computeSpinAnimation } from "@/lib/roulette-animation";
import {
  RouletteBallSvg,
  RouletteFrameSvg,
  RouletteWheelSvg,
} from "@/components/roulette/RouletteWheelSvg";
import { cn } from "@/lib/utils";

const EASING = "cubic-bezier(0.12, 0.86, 0.22, 1)";

export function RouletteWheel({
  spinning,
  targetNumber,
  onSpinEnd,
}: {
  spinning: boolean;
  targetNumber: number | null;
  onSpinEnd?: () => void;
}) {
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [durationMs, setDurationMs] = useState(5000);
  const [ballVisible, setBallVisible] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const endedRef = useRef(false);
  const wheelRotationRef = useRef(0);
  const onSpinEndRef = useRef(onSpinEnd);

  useEffect(() => {
    onSpinEndRef.current = onSpinEnd;
  }, [onSpinEnd]);

  useEffect(() => {
    wheelRotationRef.current = wheelRotation;
  }, [wheelRotation]);

  useEffect(() => {
    if (!spinning || targetNumber === null) return;
    endedRef.current = false;
    setHighlightIndex(null);
    setBallVisible(true);
    setAnimating(false);

    const spin = computeSpinAnimation(
      targetNumber,
      wheelRotationRef.current
    );
    setDurationMs(spin.durationMs);

    setBallAngle(spin.ballStart);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimating(true);
        setWheelRotation(spin.wheelFinal);
        setBallAngle(spin.ballFinal);
      });
    });

    const t = setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        setHighlightIndex(spin.winningIndex);
        setAnimating(false);
        onSpinEndRef.current?.();
      }
    }, spin.durationMs + 80);

    return () => clearTimeout(t);
  }, [spinning, targetNumber]);

  useEffect(() => {
    if (spinning && targetNumber === null) {
      setBallVisible(false);
      setHighlightIndex(null);
      setAnimating(false);
    }
  }, [spinning, targetNumber]);

  const transition = animating
    ? `transform ${durationMs}ms ${EASING}`
    : "none";

  return (
    <div className="rw-stage">
      <div className="rw-assembly">
        {/* Capa 1: disco giratorio con números */}
        <div
          className={cn("rw-wheel-layer", animating && "rw-wheel-layer--spin")}
          style={{
            transform: `rotate(${wheelRotation}deg)`,
            transition,
          }}
        >
          <RouletteWheelSvg highlightIndex={highlightIndex} />
        </div>

        {/* Capa 2: bola en pista (sentido contrario visual) */}
        {ballVisible && (
          <div
            className={cn(
              "rw-ball-layer",
              animating && "rw-ball-layer--spin",
              highlightIndex !== null && "rw-ball-layer--landed"
            )}
            style={{
              transform: `rotate(${ballAngle}deg)`,
              transition,
            }}
          >
            <div className="rw-ball-marker">
              <RouletteBallSvg />
            </div>
          </div>
        )}

        {/* Capa 3: marco fijo + puntero + pista */}
        <div className="rw-frame-layer">
          <RouletteFrameSvg />
        </div>
      </div>

      {animating && (
        <p className="rw-status" aria-live="polite">
          Girando…
        </p>
      )}
    </div>
  );
}
