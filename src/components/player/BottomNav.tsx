"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/jugar", label: "Jugar", art: ART.nav.jugar },
  { href: "/tickets", label: "Tickets", art: ART.nav.tickets },
  { href: "/resultados", label: "Resultados", art: ART.nav.resultados },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {tabs.map(({ href, label, art }) => {
        const active =
          href === "/jugar"
            ? pathname.startsWith("/jugar") || pathname.startsWith("/ruleta")
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn("nav-item", active && "active")}
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
