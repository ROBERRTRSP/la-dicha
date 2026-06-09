import { AiVisual } from "@/components/ui/AiVisual";
import { cn } from "@/lib/utils";

export function DecorativeBanner({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <div className={cn("visual-banner", className)} aria-hidden>
      <AiVisual src={src} alt="" fill sizes="100vw" className="visual-banner-img" />
      <div className="visual-banner-fade" />
    </div>
  );
}
