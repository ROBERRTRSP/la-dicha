/**
 * Post-deploy smoke tests against production.
 * Usage: node scripts/post-deploy-check.mjs [baseUrl]
 */
const BASE = (process.argv[2] || "https://consorciobelendejudea.com").replace(/\/$/, "");
/** API/cookies siempre en www cuando apex redirige (misma sesión, un solo deployment). */
const API_BASE = BASE.includes("://consorciobelendejudea.com")
  ? "https://www.consorciobelendejudea.com"
  : BASE;

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const icon = ok ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function parseCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const legacy = res.headers.get("set-cookie");
  const all = [...raw, ...(legacy ? [legacy] : [])];
  return all.map((c) => c.split(";")[0]).join("; ");
}

function mergeCookies(existing, added) {
  const jar = new Map();
  for (const part of `${existing}; ${added}`.split(";")) {
    const t = part.trim();
    if (!t || !t.includes("=")) continue;
    const [k, ...v] = t.split("=");
    jar.set(k.trim(), v.join("=").trim());
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchJson(path, opts = {}) {
  const origin = opts.useBase ? BASE : API_BASE;
  const res = await fetch(`${origin}${path}`, {
    redirect: opts.redirect ?? "follow",
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function main() {
  console.log(`\n=== Post-deploy checks: ${BASE} ===`);
  if (API_BASE !== BASE) {
    console.log(`API/cookies via: ${API_BASE} (apex → www redirect)\n`);
  } else {
    console.log("");
  }

  // Apex must redirect to www (308/307) or serve same app (200)
  try {
    const apexProbe = await fetch("https://consorciobelendejudea.com/login", {
      redirect: "manual",
    });
    const apexOk =
      apexProbe.status === 308 ||
      apexProbe.status === 307 ||
      apexProbe.status === 200;
    const loc = apexProbe.headers.get("location") ?? "";
    record(
      "Apex redirect → www",
      apexOk &&
        (apexProbe.status === 200 ||
          loc.includes("www.consorciobelendejudea.com")),
      `status ${apexProbe.status}${loc ? ` → ${loc}` : ""}`
    );
  } catch (e) {
    record("Apex redirect → www", false, e.message);
  }

  // Pages (follow redirects so apex tests hit www deployment)
  for (const path of ["/login", "/jugar", "/tickets", "/ruleta", "/cajero/login", "/admin/login"]) {
    try {
      const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
      record(`GET ${path}`, res.status === 200, `status ${res.status}`);
    } catch (e) {
      record(`GET ${path}`, false, e.message);
    }
  }

  // Player login
  let playerCookie = "";
  {
    const { res, body } = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "demo", password: "1234" }),
    });
    const set = parseCookies(res);
    playerCookie = set;
    record(
      "Login jugador (demo/1234)",
      res.ok && body?.ok,
      res.ok ? `status ${res.status}` : JSON.stringify(body)
    );
  }

  // Balance before ticket
  let balanceBefore = null;
  {
    const { res, body } = await fetchJson("/api/roulette/status", {
      headers: { Cookie: playerCookie },
    });
    if (typeof body?.balance === "number") balanceBefore = body.balance;
    record(
      "Saldo jugador (status)",
      res.ok,
      typeof body?.balance === "number" ? body.balance.toFixed(2) : "?"
    );
  }

  // Create small ticket
  let ticketId = null;
  let ticketBalanceAfter = null;
  {
    const { res: drawsRes, body: drawsBody } = await fetchJson("/api/draws", {
      headers: { Cookie: playerCookie },
    });
    const draw = drawsBody?.draws?.find?.((d) => d.status === "OPEN" || d.status === "CLOSING_SOON");
    if (!draw) {
      record("Crear jugada pequeña", false, "Sin sorteos abiertos");
    } else {
      const lines = [
        {
          id: "test-1",
          betType: "QUINIELA",
          numbers: "12",
          amount: 1,
          drawIds: [draw.id],
          lotteryNames: [draw.lotteryName || draw.lottery?.name || "Lotería"],
          addedAt: Date.now(),
        },
      ];
      const { res, body } = await fetchJson("/api/tickets", {
        method: "POST",
        headers: { Cookie: playerCookie },
        body: JSON.stringify({ lines }),
      });
      ticketId = body?.ticket?.id ?? null;
      ticketBalanceAfter = body?.ticket?.balanceAfter ?? null;
      const deducted =
        balanceBefore != null &&
        ticketBalanceAfter != null &&
        ticketBalanceAfter === balanceBefore - 1;
      record(
        "Crear jugada pequeña ($1)",
        res.ok && !!ticketId,
        res.ok
          ? `ticket ${body?.ticket?.ticketNumber} saldo ${ticketBalanceAfter} (deduct OK: ${deducted})`
          : JSON.stringify(body)
      );
      record("Descuento saldo correcto", deducted, `${balanceBefore} → ${ticketBalanceAfter}`);
    }
  }

  if (ticketId) {
    const ticketRes = await fetch(`${BASE}/tickets/${ticketId}`, {
      headers: { Cookie: playerCookie },
      redirect: "follow",
    });
    record(
      `GET /tickets/${ticketId}`,
      ticketRes.status === 200,
      `status ${ticketRes.status}`
    );
  }

  {
    const ticketsRes = await fetch(`${BASE}/tickets`, {
      headers: { Cookie: playerCookie },
      redirect: "follow",
    });
    record("GET /tickets (autenticado)", ticketsRes.status === 200, `status ${ticketsRes.status}`);
  }

  // Roulette idempotency
  {
    const bets = [{ betType: "RED", betChoice: "RED", amount: 1 }];
    const idempotencyKey = `deploy-test-${Date.now()}`;
    const spinBody = JSON.stringify({ bets, idempotencyKey });

    const first = await fetchJson("/api/roulette/spin", {
      method: "POST",
      headers: { Cookie: playerCookie },
      body: spinBody,
    });
    const second = await fetchJson("/api/roulette/spin", {
      method: "POST",
      headers: { Cookie: playerCookie },
      body: spinBody,
    });

    const noDoubleCharge =
      first.res.ok &&
      second.res.ok &&
      first.body?.winningNumber === second.body?.winningNumber &&
      first.body?.balanceAfter === second.body?.balanceAfter;

    record(
      "Ruleta giro pequeño",
      first.res.ok,
      first.res.ok
        ? `número ${first.body?.winningNumber} saldo ${first.body?.balanceAfter}`
        : JSON.stringify(first.body)
    );
    record(
      "Ruleta idempotency (misma key)",
      noDoubleCharge,
      noDoubleCharge
        ? "misma respuesta, sin doble cobro"
        : `1st=${first.body?.balanceAfter} 2nd=${second.body?.balanceAfter}`
    );

    const { res, body } = await fetchJson("/api/roulette/status", {
      headers: { Cookie: playerCookie },
    });
    record(
      "Ruleta refresh saldo",
      res.ok && typeof body?.balance === "number",
      `saldo ${body?.balance}`
    );
  }

  // Cajero
  let cajeroCookie = "";
  {
    const { res, body } = await fetchJson("/api/auth/cajero-login", {
      method: "POST",
      body: JSON.stringify({ username: "cajero", password: "1234" }),
    });
    cajeroCookie = parseCookies(res);
    record("Login cajero", res.ok && body?.ok, `status ${res.status}`);
  }

  {
    const bancaBefore = await fetchJson("/api/cajero/banca", {
      headers: { Cookie: cajeroCookie },
    });
    const { res: drawsRes, body: drawsBody } = await fetchJson("/api/cajero/draws", {
      headers: { Cookie: cajeroCookie },
    });
    const draw = drawsBody?.draws?.find?.((d) => d.status === "OPEN" || d.status === "CLOSING_SOON");
    if (!draw) {
      record("Venta cajero pequeña", false, "Sin sorteos abiertos");
    } else {
      const lines = [
        {
          id: "cajero-1",
          betType: "QUINIELA",
          numbers: "34",
          amount: 1,
          drawIds: [draw.id],
          lotteryNames: [draw.lotteryName || "Lotería"],
          addedAt: Date.now(),
        },
      ];
      const { res, body } = await fetchJson("/api/cajero/sell", {
        method: "POST",
        headers: { Cookie: cajeroCookie },
        body: JSON.stringify({ lines, confirmWarnings: true }),
      });
      const bancaAfter = await fetchJson("/api/cajero/banca", {
        headers: { Cookie: cajeroCookie },
      });
      const delta =
        bancaAfter.body?.currentBalance != null &&
        bancaBefore.body?.currentBalance != null
          ? bancaAfter.body.currentBalance - bancaBefore.body.currentBalance
          : null;
      const aligned = res.ok && delta === 1;
      record(
        "Venta cajero pequeña ($1)",
        res.ok && !!body?.ticket?.ticketNumber,
        res.ok ? `ticket ${body.ticket.ticketNumber}` : JSON.stringify(body)
      );
      record(
        "Cajero ticket + banca cuadran",
        aligned,
        `banca ${bancaBefore.body?.currentBalance} → ${bancaAfter.body?.currentBalance} (Δ ${delta})`
      );
    }
  }

  // Admin
  let adminCookie = "";
  {
    const { res, body } = await fetchJson("/api/auth/admin-login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "1234" }),
    });
    adminCookie = parseCookies(res);
    record("Login admin", res.ok && body?.ok, `status ${res.status}`);
  }

  for (const [label, path] of [
    ["Admin dashboard", "/api/admin/dashboard"],
    ["Admin tickets", "/api/admin/tickets"],
    ["Admin billeteras", "/api/admin/wallets"],
    ["Admin resultados sync", "/api/admin/draws"],
  ]) {
    const { res, body } = await fetchJson(path, {
      headers: { Cookie: adminCookie },
    });
    record(label, res.ok, res.ok ? `status ${res.status}` : JSON.stringify(body)?.slice(0, 120));
  }

  // Rate limit (solo una vez por sesión de pruebas; evita bloquear el 2.º URL)
  if (process.env.SKIP_RATE_LIMIT !== "1") {
    let got429 = false;
    for (let i = 0; i < 7; i++) {
      const { res } = await fetchJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "ratelimit-probe", password: "wrong" }),
      });
      if (res.status === 429) {
        got429 = true;
        break;
      }
    }
    record("Rate limit login (6+ intentos → 429)", got429, got429 ? "429 recibido" : "no 429");
  } else {
    record("Rate limit login (6+ intentos → 429)", true, "omitido (SKIP_RATE_LIMIT=1)");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
