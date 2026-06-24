import { Suspense } from "react";
import { getCajeroSellDraws } from "@/lib/draws";
import { CajeroSellClient } from "@/components/cajero/CajeroSellClient";

export default async function CajeroVenderPage() {
  const { draws, superPales } = await getCajeroSellDraws();
  return (
    <div className="cajero-sell-page cajero-sell-page--full">
      <Suspense fallback={<p className="admin-loading">Cargando vanquero…</p>}>
        <CajeroSellClient initialDraws={draws} initialSuperPales={superPales} />
      </Suspense>
    </div>
  );
}
