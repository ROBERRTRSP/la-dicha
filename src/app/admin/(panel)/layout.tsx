import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="staff-shell">
      <AdminNav userName={admin.fullName} />
      <main className="staff-main">{children}</main>
    </div>
  );
}
