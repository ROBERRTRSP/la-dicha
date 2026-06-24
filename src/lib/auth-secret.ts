export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET debe configurarse en producción.");
  }
  return new TextEncoder().encode(secret ?? "la-dicha-dev-secret");
}
