import { redirect } from "next/navigation";
import { requireCajero } from "@/lib/auth";
import { CajeroNav } from "@/components/cajero/CajeroNav";

export default async function CajeroPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cajero = await requireCajero();
  if (!cajero) redirect("/cajero/login");

  return (
    <div className="staff-shell staff-shell--cajero">
      <CajeroNav userName={cajero.fullName} />
      <main className="staff-main">{children}</main>
    </div>
  );
}
