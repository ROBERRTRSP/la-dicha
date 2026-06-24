"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      title="Error al cargar Jugar"
      homeHref="/jugar"
      homeLabel="Ir a Jugar"
    />
  );
}
