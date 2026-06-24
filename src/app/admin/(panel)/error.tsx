"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      title="Error en el panel de administración"
      homeHref="/admin"
      homeLabel="Ir al inicio de admin"
    />
  );
}
