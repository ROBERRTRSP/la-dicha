import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.SLOT_PREVIEW_BASE_URL ?? "http://127.0.0.1:3000";
const TARGET_PATH = "/dev/slot-preview";
const OUTPUT_DIR = path.resolve("artifacts", "slot-landscape-ios");

const LANDSCAPE_CASES = [
  {
    id: "iphone-se-landscape",
    viewport: { width: 667, height: 375 },
    scale: 2,
    browsers: ["webkit", "chromium"],
  },
  {
    id: "iphone-14-15-landscape",
    viewport: { width: 844, height: 390 },
    scale: 3,
    browsers: ["webkit", "chromium"],
  },
  {
    id: "iphone-pro-max-landscape",
    viewport: { width: 932, height: 430 },
    scale: 3,
    browsers: ["webkit", "chromium"],
  },
];

const toNum = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, ""));

async function waitForReady(page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await page.goto(`${BASE_URL}${TARGET_PATH}`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    const status = response?.status() ?? 0;
    if (status >= 400) {
      await page.waitForTimeout(1000);
      continue;
    }
    const hasSpin = await page
      .getByTestId("spin-button")
      .isVisible()
      .catch(() => false);
    if (hasSpin) return;
    await page.waitForTimeout(1000);
  }
  await page.getByTestId("spin-button").waitFor({ timeout: 30000 });
}

async function viewCheck(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const visible = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0;
    };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const shell = rect(".slot-landscape-shell");
    const machine = rect(".slot-landscape-machine");
    const spin = rect('[data-testid="spin-button"]');
    const betButtons = Array.from(document.querySelectorAll(".slot-bet-btn")).map((el) =>
      el.getBoundingClientRect()
    );
    const minFont = Math.min(
      ...Array.from(document.querySelectorAll("button, .slot-result-strip"))
        .map((el) => Number.parseFloat(window.getComputedStyle(el).fontSize || "16"))
    );
    const viewportFit = document.querySelector("meta[name='viewport']")?.getAttribute("content") || "";
    const safeLeft = getComputedStyle(document.documentElement).getPropertyValue("--slot-safe-left");
    const toastWin = visible('[data-testid="toast-win"]');
    const toastLose = visible('[data-testid="toast-no-win"]');

    return {
      viewport: { width: vw, height: vh },
      checks: {
        noTopCut: Boolean(shell && shell.top >= 0),
        noBottomCut: Boolean(shell && shell.bottom <= vh + 1),
        noSideCut: Boolean(shell && shell.left >= 0 && shell.right <= vw + 1),
        notchSafe: Boolean(machine && machine.left >= 0 && machine.right <= vw + 1),
        spinVisibleComfortable: Boolean(spin && spin.width >= 88 && spin.height >= 88),
        betButtonsVisible: betButtons.every((b) => b.height >= 40 && b.bottom <= vh + 1),
        rulesAccessible: visible(".slot-landscape-actions .slot-rules-btn"),
        noWeirdScroll: document.documentElement.scrollWidth <= vw + 1,
        noZoomAccidental: Number.isFinite(minFont) && minFont >= 16,
        toastsNotOverlap: !(toastWin && toastLose),
        viewportFitCover: viewportFit.includes("viewport-fit=cover"),
        safeAreaVarsPresent: safeLeft.trim().length > 0,
      },
    };
  });
}

async function runVisualCase(browserType, scenario) {
  const browser = await (browserType === "webkit" ? webkit : chromium).launch();
  try {
    const context = await browser.newContext({
      viewport: scenario.viewport,
      deviceScaleFactor: scenario.scale,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await waitForReady(page);

    await page.getByTestId("mode-win").click({ force: true });
    await page.getByTestId("spin-button").click({ force: true });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="preview-awaiting"]')?.textContent === "0",
      undefined,
      { timeout: 30000 }
    );

    const snapshot = await viewCheck(page);
    const shot = path.join(OUTPUT_DIR, `${scenario.id}-${browserType}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    await context.close();
    return { id: scenario.id, browser: browserType, screenshot: shot, ...snapshot };
  } finally {
    await browser.close();
  }
}

async function runFunctional20Spins() {
  const browser = await webkit.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const apiCalls = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/")) apiCalls.push(req.url());
    });
    await waitForReady(page);

    const spinOne = async (mode, doubleTap = false) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const beforeSpins = toNum(await page.getByTestId("stats-spins").textContent());
        const beforeBalance = toNum(await page.getByTestId("preview-balance").textContent());
        await page.getByTestId(`mode-${mode}`).click({ force: true });
        await page.getByTestId("spin-button").click({ force: true });
        if (doubleTap && attempt === 0) {
          await page.getByTestId("spin-button").click({ force: true }).catch(() => {});
        }
        const started = await page
          .waitForFunction(
            () =>
              document.querySelector('[data-testid="preview-awaiting"]')?.textContent === "1" ||
              Boolean(document.querySelector(".slot-result-strip--error")),
            undefined,
            { timeout: 12000 }
          )
          .then(() => true)
          .catch(() => false);
        if (!started) {
          if (attempt === 2) throw new Error("El giro demo no inicio.");
          continue;
        }

        const spinDisabled = await page.getByTestId("spin-button").isDisabled();
        await page.getByTestId("bet-10").click({ force: true }).catch(() => {});
        const betLocked = (await page.getByTestId("preview-bet").textContent()) !== "10.00";
        const balanceDuring = toNum(await page.getByTestId("preview-balance").textContent());
        const incremented = await page
          .waitForFunction(
            (expected) =>
              Number(document.querySelector('[data-testid="stats-spins"]')?.textContent || "0") >=
              expected,
            beforeSpins + 1,
            { timeout: 45000 }
          )
          .then(() => true)
          .catch(() => false);
        await page
          .waitForFunction(
            () =>
              document.querySelector('[data-testid="preview-awaiting"]')?.textContent === "0" ||
              Boolean(document.querySelector(".slot-result-strip--error")),
            undefined,
            { timeout: 30000 }
          )
          .catch(() => {});

        if (!incremented) {
          if (attempt === 2) throw new Error("El giro demo no finalizo.");
          continue;
        }

        const afterSpins = toNum(await page.getByTestId("stats-spins").textContent());
        const lastWin = toNum(await page.getByTestId("preview-last-win").textContent());
        const toastWin = await page.getByTestId("toast-win").isVisible().catch(() => false);
        const toastLose = await page.getByTestId("toast-no-win").isVisible().catch(() => false);
        return {
          spinDisabled,
          betLocked,
          balanceUpdatedAfterResult: balanceDuring === beforeBalance,
          noDoubleSpin: afterSpins === beforeSpins + 1,
          noToastOverlap: !(toastWin && toastLose),
          isWin: lastWin > 0,
        };
      }
      throw new Error("No se pudo completar giro demo.");
    };

    const checks = {
      spinBlockedDuringSpin: true,
      betBlockedDuringSpin: true,
      balanceChangesAfterResultOnly: true,
      noToastOverlap: true,
      noDoubleTapSpin: true,
      winningLinesMatch: true,
    };

    let wins = 0;
    let losses = 0;
    for (let i = 0; i < 10; i++) {
      const result = await spinOne("lose", i === 0);
      checks.spinBlockedDuringSpin &&= result.spinDisabled;
      checks.betBlockedDuringSpin &&= result.betLocked;
      checks.balanceChangesAfterResultOnly &&= result.balanceUpdatedAfterResult;
      checks.noToastOverlap &&= result.noToastOverlap;
      checks.noDoubleTapSpin &&= result.noDoubleSpin;
      losses += result.isWin ? 0 : 1;
    }
    for (let i = 0; i < 10; i++) {
      const result = await spinOne("win");
      checks.spinBlockedDuringSpin &&= result.spinDisabled;
      checks.betBlockedDuringSpin &&= result.betLocked;
      checks.balanceChangesAfterResultOnly &&= result.balanceUpdatedAfterResult;
      checks.noToastOverlap &&= result.noToastOverlap;
      checks.noDoubleTapSpin &&= result.noDoubleSpin;
      if (result.isWin) {
        wins += 1;
        const badgeCount = await page.locator(".slot-payline-badge--active").count();
        checks.winningLinesMatch &&= badgeCount > 0;
      }
    }

    const disallowed = apiCalls.filter(
      (url) =>
        url.includes("/api/slots/spin") ||
        url.includes("/api/wallet") ||
        url.includes("/api/tickets")
    );
    await context.close();
    return {
      spins: 20,
      wins,
      losses,
      checks: {
        ...checks,
        noRealApiCalls: disallowed.length === 0,
      },
      disallowedCalls: disallowed,
      apiCalls: apiCalls.length,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const visual = [];
  for (const scenario of LANDSCAPE_CASES) {
    for (const browserName of scenario.browsers) {
      // eslint-disable-next-line no-await-in-loop
      visual.push(await runVisualCase(browserName, scenario));
    }
  }
  const functional = await runFunctional20Spins();
  const report = {
    baseUrl: BASE_URL,
    path: TARGET_PATH,
    createdAt: new Date().toISOString(),
    visual,
    functional,
    pwaNote:
      "Playwright valida viewport-fit=cover y safe-area CSS. Standalone real requiere instalar PWA en dispositivo iOS físico.",
  };
  const file = path.join(OUTPUT_DIR, "landscape-report.json");
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Landscape report saved to ${file}`);
}

main().catch((error) => {
  console.error("Landscape validation failed.");
  console.error(error);
  process.exitCode = 1;
});
