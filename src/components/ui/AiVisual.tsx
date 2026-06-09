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
}: {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
}) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={cn("object-cover", className)}
        sizes={sizes ?? "100vw"}
        priority={priority}
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
    />
  );
}
