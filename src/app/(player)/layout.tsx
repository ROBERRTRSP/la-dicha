import { redirect } from "next/navigation";
import { getSession, requirePlayer } from "@/lib/auth";
import { BottomNav } from "@/components/player/BottomNav";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePlayer();
  if (!user) {
    const session = await getSession();
    if (session) redirect("/api/auth/logout?next=/login");
    redirect("/login");
  }

  return (
    <div className="player-shell">
      <main className="player-content">{children}</main>
      <BottomNav />
    </div>
  );
}
