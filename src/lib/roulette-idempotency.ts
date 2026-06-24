import { Prisma } from "@prisma/client";
import { prisma } from "./db";

const TTL_MS = 24 * 60 * 60 * 1000;

export function extractIdempotencyKey(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const key = (body as Record<string, unknown>).idempotencyKey;
  if (typeof key !== "string" || key.length < 8 || key.length > 128) return null;
  return key.trim();
}

function parseCached(row: { responseJson: string; expiresAt: Date }) {
  if (row.expiresAt < new Date()) return null;
  if (!row.responseJson) return null;
  try {
    return JSON.parse(row.responseJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function beginSpinIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<{ cached: Record<string, unknown> | null }> {
  const existing = await prisma.rouletteSpinIdempotency.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
  });

  if (existing) {
    const cached = parseCached(existing);
    if (cached) return { cached };
    throw new Error(
      "Este giro ya está en proceso. Espera un momento e intenta de nuevo."
    );
  }

  try {
    await prisma.rouletteSpinIdempotency.create({
      data: {
        userId,
        idempotencyKey,
        responseJson: "",
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const row = await prisma.rouletteSpinIdempotency.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });
      const cached = row ? parseCached(row) : null;
      if (cached) return { cached };
      throw new Error(
        "Este giro ya está en proceso. Espera un momento e intenta de nuevo."
      );
    }
    throw e;
  }

  return { cached: null };
}

export async function saveSpinResponse(
  userId: string,
  idempotencyKey: string,
  response: Record<string, unknown>
) {
  await prisma.rouletteSpinIdempotency.update({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    data: {
      responseJson: JSON.stringify(response),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
}

export async function releaseSpinIdempotency(
  userId: string,
  idempotencyKey: string
) {
  await prisma.rouletteSpinIdempotency.deleteMany({
    where: { userId, idempotencyKey, responseJson: "" },
  });
}
