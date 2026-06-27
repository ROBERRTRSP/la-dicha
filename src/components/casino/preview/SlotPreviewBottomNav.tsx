"use client";

import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Jugar", art: ART.nav.jugar, active: false },
  { label: "Casino", art: ART.ruletaChip, active: true },
  { label: "Tickets", art: ART.nav.tickets, active: false },
  { label: "Resultados", art: ART.nav.resultados, active: false },
];

export function SlotPreviewBottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegacion preview">
      {tabs.map((tab) => (
        <div
          key={tab.label}
          className={cn(
            "nav-item",
            tab.active && "active",
            tab.active && tab.label === "Casino" && "nav-item--casino"
          )}
        >
          <AiVisual
            src={tab.art}
            alt=""
            width={30}
            height={30}
            className={cn("nav-item-art", tab.active && "nav-item-art--active")}
          />
          <span>{tab.label}</span>
        </div>
      ))}
    </nav>
  );
}
