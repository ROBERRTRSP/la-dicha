"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      title="Error en la venta en mostrador"
      homeHref="/cajero"
      homeLabel="Ir al inicio de cajero"
    />
  );
}
