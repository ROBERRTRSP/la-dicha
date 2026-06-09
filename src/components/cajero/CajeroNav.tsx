"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/cajero", label: "Inicio", exact: true },
  { href: "/cajero/jugadores", label: "Jugadores" },
  { href: "/cajero/recargar", label: "Recargar" },
  { href: "/cajero/tickets", label: "Tickets" },
];

export function CajeroNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/cajero/login");
    router.refresh();
  }

  return (
    <aside className="staff-nav staff-nav--cajero">
      <div className="staff-nav-brand">
        <p className="staff-nav-title">La Dicha</p>
        <p className="staff-nav-role">Cajero</p>
      </div>
      <nav className="staff-nav-links">
        {LINKS.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`staff-nav-link${active ? " active" : ""}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="staff-nav-foot">
        <p className="staff-nav-user">{userName}</p>
        <button type="button" className="staff-nav-logout" onClick={logout}>
          Salir
        </button>
      </div>
    </aside>
  );
}
