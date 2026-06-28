import {
  consumeRateLimit,
  getClientIp,
  rateLimitResponse,
  ROULETTE_SPIN_RATE,
  SLOT_SPIN_RATE,
  spinRateLimitKey,
} from "@/lib/rate-limit";

/** Limita giros por jugador; cap secundario por IP contra abuso automatizado. */
export function enforceSpinRateLimit(
  request: Request,
  userId: string,
  action: "slot" | "roulette"
): Response | null {
  const config = action === "slot" ? SLOT_SPIN_RATE : ROULETTE_SPIN_RATE;
  const userKey = spinRateLimitKey(userId, action);
  const ip = getClientIp(request);
  const ipKey = `${userKey}:ip:${ip}`;

  const userBlocked = consumeRateLimit(
    userKey,
    config.maxAttempts,
    config.windowMs
  );
  if (!userBlocked.ok) {
    return rateLimitResponse(userBlocked.retryAfterSec);
  }

  const ipCap = Math.ceil(config.maxAttempts * 1.5);
  const ipBlocked = consumeRateLimit(ipKey, ipCap, config.windowMs);
  if (!ipBlocked.ok) {
    return rateLimitResponse(ipBlocked.retryAfterSec);
  }

  return null;
}
