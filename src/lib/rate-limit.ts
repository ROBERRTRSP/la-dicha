type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/** Solo consulta; no incrementa contador. */
export function getRateLimitStatus(
  key: string,
  maxAttempts: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  cleanupExpired();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    return { ok: true };
  }

  if (bucket.count >= maxAttempts) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { ok: true };
}

/** Incrementa solo tras intento fallido de login. */
export function recordFailedLogin(
  key: string,
  maxAttempts: number,
  windowMs: number
) {
  cleanupExpired();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
}

export function rateLimitResponse(retryAfterSec: number) {
  return new Response(
    JSON.stringify({
      error: `Demasiados intentos. Espera ${retryAfterSec} segundos e intenta de nuevo.`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}

/** 5 fallos por IP cada 15 minutos en rutas de login. */
export const LOGIN_RATE = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };
