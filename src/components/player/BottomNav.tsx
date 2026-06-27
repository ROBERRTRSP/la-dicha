"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";
import { CASINO_ROUTE_PREFIXES } from "@/lib/casino-routes";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/jugar", label: "Jugar", art: ART.nav.jugar, match: ["/jugar"] },
  { href: "/ruleta", label: "Casino", art: ART.ruletaChip, match: [...CASINO_ROUTE_PREFIXES] },
  { href: "/tickets", label: "Tickets", art: ART.nav.tickets, match: ["/tickets"] },
  {
    href: "/resultados",
    label: "Resultados",
    art: ART.nav.resultados,
    match: ["/resultados"],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    for (const tab of tabs) {
      router.prefetch(tab.href);
    }
  }, [router]);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav className="bottom-nav">
      {tabs.map(({ href, label, art, match }) => {
        const active = match.some((prefix) => pathname.startsWith(prefix));
        const pending = pendingHref === href && !active;
        return (
          <Link
            key={href}
            href={href}
            prefetch
            className={cn(
              "nav-item",
              href === "/ruleta" && "nav-item--casino",
              active && "active",
              pending && "nav-item--pending"
            )}
            onClick={() => setPendingHref(href)}
          >
            <AiVisual
              src={art}
              alt=""
              width={28}
              height={28}
              className={cn("nav-item-art", active && "nav-item-art--active")}
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
