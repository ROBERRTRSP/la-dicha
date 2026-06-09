import { AiVisual } from "@/components/ui/AiVisual";
import { rouletteBallArt } from "@/lib/visual-assets";
import { cn } from "@/lib/utils";

export function RouletteResultBall({
  number,
  color,
  size = 52,
  className,
}: {
  number: number;
  color: "red" | "black" | "green";
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("roulette-result-ball", className)}
      style={{ width: size, height: size }}
    >
      <AiVisual
        src={rouletteBallArt(color)}
        alt=""
        width={size}
        height={size}
        className="roulette-result-ball-img"
      />
      <span
        className="roulette-result-ball-num"
        style={{ fontSize: Math.max(11, size * 0.32) }}
      >
        {number}
      </span>
    </div>
  );
}
