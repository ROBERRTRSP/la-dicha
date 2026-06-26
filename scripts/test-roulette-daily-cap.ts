import {
  scaleOutcomesToDailyPayoutCap,
  type RouletteOutcomeDraft,
} from "../src/lib/roulette-daily-payout";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function outcome(payout: number, amount = 1): RouletteOutcomeDraft {
  const won = payout > 0;
  return {
    betType: "RED",
    betChoice: "RED",
    amount,
    won,
    payout,
    profit: payout - amount,
    result: won ? "WIN" : "LOSE",
  };
}

console.log("\n=== Roulette daily payout cap ===\n");

{
  const r = scaleOutcomesToDailyPayoutCap([outcome(0), outcome(0)], 100);
  assert(r.totalPayout === 0, "sin premios");
  console.log("  ✓ sin premios no altera");
}

{
  const r = scaleOutcomesToDailyPayoutCap([outcome(10), outcome(20)], 30);
  assert(r.totalPayout === 30, "cabe completo");
  assert(r.message === null, "sin mensaje");
  console.log("  ✓ premio dentro del cupo");
}

{
  const r = scaleOutcomesToDailyPayoutCap([outcome(10), outcome(20)], 15);
  assert(r.totalPayout === 15, "escala a 15");
  assert(r.message !== null, "mensaje de ajuste");
  console.log("  ✓ premio escalado al cupo restante");
}

{
  const r = scaleOutcomesToDailyPayoutCap([outcome(10)], 0);
  assert(r.totalPayout === 0, "cero payout");
  assert(r.outcomes[0].won === false, "marca como sin premio");
  assert(r.message !== null && r.message.includes("límite"), "mensaje de límite");
  console.log("  ✓ cupo agotado bloquea premio");
}

console.log("\n=== RESULTADO: 4 passed ===\n");
