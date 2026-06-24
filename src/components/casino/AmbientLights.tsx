"use client";

import { cn } from "@/lib/utils";

export function AmbientLights({ className }: { className?: string }) {
  return (
    <div className={cn("slot-ambient-lights", className)} aria-hidden>
      <span className="slot-ambient-light slot-ambient-light--left" />
      <span className="slot-ambient-light slot-ambient-light--right" />
      <span className="slot-ambient-light slot-ambient-light--top" />
      <span className="slot-ambient-spark slot-ambient-spark--1" />
      <span className="slot-ambient-spark slot-ambient-spark--2" />
      <span className="slot-ambient-spark slot-ambient-spark--3" />
    </div>
  );
}
