/**
 * ID único compatible con navegador, móvil, Safari, WebView y Node.
 * Usa crypto.randomUUID cuando existe; si no, fallback seguro.
 */
export function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    "id-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 11)
  );
}
