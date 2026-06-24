"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/jugar", label: "Jugar", art: ART.nav.jugar, match: ["/jugar"] },
  { href: "/ruleta", label: "Ruleta", art: ART.ruletaChip, match: ["/ruleta"] },
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
