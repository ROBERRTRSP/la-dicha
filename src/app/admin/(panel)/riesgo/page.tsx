import { AdminRiskPanel } from "@/components/admin/AdminRiskPanel";

export default function AdminRiesgoPage() {
  return (
    <div>
      <h1 className="admin-page-title">Modo Riesgo</h1>
      <p className="admin-ruleta-sub">
        Jugadas calientes, exposición de la casa y sorteos prioritarios · datos
        reales de tickets
      </p>
      <AdminRiskPanel />
    </div>
  );
}
