-- CreateTable
CREATE TABLE "RouletteSpinIdempotency" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "responseJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouletteSpinIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouletteSpinIdempotency_expiresAt_idx" ON "RouletteSpinIdempotency"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RouletteSpinIdempotency_userId_idempotencyKey_key" ON "RouletteSpinIdempotency"("userId", "idempotencyKey");

