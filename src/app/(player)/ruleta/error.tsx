"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      title="Error al cargar la ruleta"
      homeHref="/ruleta"
      homeLabel="Volver a Ruleta"
    />
  );
}
