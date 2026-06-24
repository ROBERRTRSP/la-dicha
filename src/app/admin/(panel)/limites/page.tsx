import { AdminPlayLimitsPanel } from "@/components/admin/AdminPlayLimitsPanel";

export default function AdminLimitesPage() {
  return (
    <div>
      <h1 className="admin-page-title">Límites por jugada</h1>
      <p className="admin-ruleta-sub">
        Restricciones de venta en cajero — directo, palé, tripleta y súper palé
      </p>
      <AdminPlayLimitsPanel />
    </div>
  );
}
