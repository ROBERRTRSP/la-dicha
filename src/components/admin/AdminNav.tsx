"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Inicio", exact: true },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/billeteras", label: "Billeteras" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/sorteos", label: "Sorteos" },
  { href: "/admin/resultados", label: "Resultados" },
  { href: "/admin/ruleta", label: "Ruleta" },
];

export function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="staff-nav staff-nav--admin">
      <div className="staff-nav-brand">
        <p className="staff-nav-title">La Dicha</p>
        <p className="staff-nav-role">Administrador</p>
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
