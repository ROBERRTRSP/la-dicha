"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      title="Error al cargar el casino"
      homeHref="/ruleta"
      homeLabel="Volver al casino"
    />
  );
}
