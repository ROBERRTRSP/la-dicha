import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { BottomNav } from "@/components/player/BottomNav";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  return (
    <div className="player-shell">
      <main className="player-content">{children}</main>
      <BottomNav />
    </div>
  );
}
