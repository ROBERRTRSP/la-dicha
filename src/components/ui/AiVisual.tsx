"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function AiVisual({
  src,
  alt = "",
  width,
  height,
  className,
  priority,
  fill,
  sizes,
  fallbackClassName,
}: {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center bg-slate-800/80 text-[10px] font-bold uppercase tracking-wide text-amber-200",
          fill ? "absolute inset-0" : "rounded-lg",
          fallbackClassName,
          className
        )}
        aria-hidden={!alt}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        LD
      </span>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={cn("object-cover", className)}
        sizes={sizes ?? "100vw"}
        priority={priority}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 48}
      height={height ?? 48}
      className={className}
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
}
