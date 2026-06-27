import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.SLOT_PREVIEW_BASE_URL ?? "http://127.0.0.1:3000";
const PREVIEW_PATH = "/dev/slot-preview";
const OUTPUT_DIR = path.resolve("artifacts", "slot-preview");

const VIEWPORTS = [
  {
    id: "iphone-se-vertical",
    browser: "webkit",
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
  },
  {
    id: "iphone-14-15-vertical",
    browser: "webkit",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  },
  {
    id: "iphone-15-pro-max-vertical",
    browser: "webkit",
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
  },
  {
    id: "android-small-vertical",
    browser: "chromium",
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2.5,
  },
  {
    id: "iphone-landscape-warning",
    browser: "webkit",
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 3,
    expectLandscapeWarning: true,
  },
];

function numberFromText(value) {
  return Number(String(value ?? "").replace(/[^\d.-]/g, ""));
}

async function waitForSpinIdle(page) {
  await page.waitForFunction(
    () => {
      const awaiting = document.querySelector('[data-testid="preview-awaiting"]')?.textContent;
      const hasError = Boolean(document.querySelector(".slot-result-strip--error"));
      return awaiting === "0" || hasError;
    },
    undefined,
    { timeout: 45000 }
  );
}

async function clickSpin(page) {
  await page.getByTestId("spin-button").click({ force: true });
}

async function setMode(page, mode) {
  await page.getByTestId(`mode-${mode}`).click({ force: true });
}

async function getNumericTestId(page, id) {
  return numberFromText(await page.getByTestId(id).textContent());
}

async function evaluateViewportChecklist(page, expectLandscapeWarning) {
  return page.evaluate((landscapeExpected) => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    const visible = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 0;
    };
    const buttonVisibleByText = (needle) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const match = buttons.find((btn) =>
        (btn.textContent || "").toLowerCase().includes(needle.toLowerCase())
      );
      if (!match) return false;
      const box = match.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 0;
    };

    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const header = rect(".slot-header-banner");
    const cabinet = rect(".slot-cabinet");
    const reels = rect(".slot-reels");
    const footer = rect(".bottom-nav");
    const spin = rect('[data-testid="spin-button"]');
    const reelsCenter = reels ? reels.left + reels.width / 2 : null;
    const cabinetCenter = cabinet ? cabinet.left + cabinet.width / 2 : null;

    const toastWinVisible = visible('[data-testid="toast-win"]');
    const toastLoseVisible = visible('[data-testid="toast-no-win"]');
    const toastErrorVisible = visible(".slot-result-strip--error");
    const activeToastCount = [toastWinVisible, toastLoseVisible, toastErrorVisible].filter(
      Boolean
    ).length;
    const activeBadgeCount = document.querySelectorAll(".slot-payline-badge--active").length;
    const activePathCount = document.querySelectorAll(".slot-payline-path--active").length;

    const betButtons = Array.from(
      document.querySelectorAll('.slot-bet-btn')
    ).map((btn) => btn.getBoundingClientRect());

    const minButtonFont = Math.min(
      ...Array.from(document.querySelectorAll(".slot-bet-btn, .slot-spin-button")).map((el) =>
        Number.parseFloat(window.getComputedStyle(el).fontSize || "0")
      )
    );

    const warningVisible =
      document.body.textContent?.includes(
        "Gira tu telefono a vertical para jugar mejor."
      ) ||
      document.body.textContent?.includes(
        "Gira tu teléfono a vertical para jugar mejor."
      ) ||
      false;

    return {
      viewport: { width: vpW, height: vpH },
      checks: {
        noTopCut: Boolean(header && header.top >= 0),
        noBottomCut: Boolean(
          footer &&
            footer.bottom <= vpH + 1 &&
            spin &&
            spin.bottom <= footer.top - 2
        ),
        noSideCut: Boolean(cabinet && cabinet.left >= 0 && cabinet.right <= vpW + 1),
        notchOrIslandNotBlocking: Boolean(header && header.top >= 0),
        footerNotBlockingContent: Boolean(
          footer &&
            betButtons.length > 0 &&
            betButtons.every((b) => b.bottom <= footer.top - 2)
        ),
        spinVisibleComfortable: Boolean(
          spin &&
            spin.width >= 88 &&
            spin.height >= 88 &&
            spin.bottom <= vpH &&
            spin.top >= 0
        ),
        betButtonsVisible: betButtons.every(
          (b) => b.width > 0 && b.height >= 40 && b.top >= 0 && b.bottom <= vpH
        ),
        rulesAccessible: buttonVisibleByText("reglas"),
        pagosAccessible: buttonVisibleByText("pagos"),
        bannerNotCut: Boolean(header && header.height > 40 && header.top >= 0),
        reelsCentered: Boolean(
          reelsCenter !== null &&
            cabinetCenter !== null &&
            Math.abs(reelsCenter - cabinetCenter) <= 8
        ),
        winningLinesAligned:
          toastWinVisible ? activeBadgeCount > 0 && activePathCount > 0 : true,
        messagesNotOverlapping: activeToastCount <= 1,
        noWeirdScroll:
          document.documentElement.scrollWidth <= vpW + 1 &&
          Math.abs(window.scrollX) <= 1,
        noZoomAccidental: Number.isFinite(minButtonFont) && minButtonFont >= 16,
        landscapeWarningShown: landscapeExpected ? warningVisible : true,
      },
      toastState: { toastWinVisible, toastLoseVisible, toastErrorVisible },
    };
  }, expectLandscapeWarning);
}

async function runViewportVisual(browserKind, config) {
  const browser = await (browserKind === "webkit" ? webkit : chromium).launch();
  try {
    const context = await browser.newContext({
      viewport: config.viewport,
      deviceScaleFactor: config.deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${PREVIEW_PATH}`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.getByTestId("spin-button").waitFor({ timeout: 30000 });

    const measureReelPlacement = async () =>
      page.evaluate(() => {
        const reels = document.querySelector(".slot-reels")?.getBoundingClientRect();
        const cabinet = document.querySelector(".slot-cabinet")?.getBoundingClientRect();
        if (!reels || !cabinet) {
          return null;
        }
        return {
          offsetX: reels.left - cabinet.left,
          offsetY: reels.top - cabinet.top,
          width: reels.width,
          height: reels.height,
        };
      });

    await setMode(page, "win");
    const reelsBefore = await measureReelPlacement();
    await clickSpin(page);
    await page.waitForTimeout(250);
    const reelsDuring = await measureReelPlacement();
    await waitForSpinIdle(page);
    const reelsAfter = await measureReelPlacement();

    const maxShift = Math.max(
      Math.abs((reelsBefore?.offsetX ?? 0) - (reelsDuring?.offsetX ?? 0)),
      Math.abs((reelsBefore?.offsetY ?? 0) - (reelsDuring?.offsetY ?? 0)),
      Math.abs((reelsBefore?.width ?? 0) - (reelsAfter?.width ?? 0)),
      Math.abs((reelsBefore?.height ?? 0) - (reelsAfter?.height ?? 0))
    );

    const checklist = await evaluateViewportChecklist(
      page,
      Boolean(config.expectLandscapeWarning)
    );
    const screenshotPath = path.join(OUTPUT_DIR, `${config.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await context.close();

    return {
      id: config.id,
      screenshotPath,
      maxLayoutShiftPx: Number(maxShift.toFixed(2)),
      checks: {
        ...checklist.checks,
        noLayoutShiftDuringSpin: config.expectLandscapeWarning ? true : maxShift <= 2,
      },
      toastState: checklist.toastState,
      viewport: checklist.viewport,
    };
  } finally {
    await browser.close();
  }
}

async function runFunctionalSpins() {
  const browser = await webkit.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const apiRequests = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/")) {
        apiRequests.push(req.url());
      }
    });

    await page.goto(`${BASE_URL}${PREVIEW_PATH}`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.getByTestId("spin-button").waitFor({ timeout: 30000 });

    const startingBalance = await getNumericTestId(page, "preview-balance");
    const startingSpins = await getNumericTestId(page, "stats-spins");
    let blockedSpinButtonDuringSpin = true;
    let blockedBetChangeDuringSpin = true;
    let noToastOverlap = true;
    let winningLineVisibleOnWins = true;
    let doubleTapBlocked = true;
    let balanceChangesAfterResultOnly = true;
    let wins = 0;
    let losses = 0;

    const runSpin = async (mode, doubleTap = false) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await setMode(page, mode);
        const betBefore = await getNumericTestId(page, "preview-bet");
        const spinsBefore = await getNumericTestId(page, "stats-spins");
        const balanceBefore = await getNumericTestId(page, "preview-balance");
        await page.getByTestId("spin-button").click({ force: true });
        if (doubleTap && attempt === 0) {
          await page
            .getByTestId("spin-button")
            .click({ timeout: 500, force: true })
            .catch(() => {});
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
          if (attempt === 2) {
            throw new Error("El giro demo no inicio en el tiempo esperado.");
          }
          continue;
        }

        const spinDisabled = await page.getByTestId("spin-button").isDisabled();
        blockedSpinButtonDuringSpin = blockedSpinButtonDuringSpin && spinDisabled;

        const selectedBet = await getNumericTestId(page, "preview-bet");
        const altBet = [1, 2, 5, 10].find((v) => v !== selectedBet) ?? 1;
        const differentBetButton = page.getByTestId(`bet-${altBet}`);
        await differentBetButton.click({ timeout: 500, force: true }).catch(() => {});
        const betDuringSpin = await getNumericTestId(page, "preview-bet");
        blockedBetChangeDuringSpin =
          blockedBetChangeDuringSpin &&
          betDuringSpin === selectedBet &&
          selectedBet === betBefore;

        const balanceDuring = await getNumericTestId(page, "preview-balance");
        balanceChangesAfterResultOnly =
          balanceChangesAfterResultOnly && balanceDuring === balanceBefore;

        const incremented = await page
          .waitForFunction(
            (expected) =>
              Number(document.querySelector('[data-testid="stats-spins"]')?.textContent || "0") >=
              expected,
            spinsBefore + 1,
            { timeout: 45000 }
          )
          .then(() => true)
          .catch(() => false);

        await waitForSpinIdle(page).catch(() => {});
        const hasError = await page
          .locator(".slot-result-strip--error")
          .isVisible()
          .catch(() => false);
        if (!incremented || hasError) {
          if (attempt === 2) {
            throw new Error("El giro demo no pudo completarse correctamente.");
          }
          continue;
        }

        const spinsAfter = await getNumericTestId(page, "stats-spins");
        if (doubleTap) {
          doubleTapBlocked = doubleTapBlocked && spinsAfter === spinsBefore + 1;
        }

        const toastWinVisible = await page
          .getByTestId("toast-win")
          .isVisible()
          .catch(() => false);
        const toastLoseVisible = await page
          .getByTestId("toast-no-win")
          .isVisible()
          .catch(() => false);
        noToastOverlap = noToastOverlap && !(toastWinVisible && toastLoseVisible);

        const lastWin = await getNumericTestId(page, "preview-last-win");
        if (lastWin > 0) {
          wins += 1;
          const activeBadges = await page.locator(".slot-payline-badge--active").count();
          winningLineVisibleOnWins = winningLineVisibleOnWins && activeBadges > 0;
        } else {
          losses += 1;
        }
        return;
      }
    };

    for (let i = 0; i < 10; i++) {
      await runSpin("lose", i === 0);
    }
    for (let i = 0; i < 10; i++) {
      await runSpin("win");
    }

    const endingBalance = await getNumericTestId(page, "preview-balance");
    const endingSpins = await getNumericTestId(page, "stats-spins");
    await context.close();

    const disallowedCalls = apiRequests.filter(
      (url) =>
        url.includes("/api/slots/spin") ||
        url.includes("/api/tickets") ||
        url.includes("/api/wallet")
    );

    return {
      startingBalance,
      endingBalance,
      startingSpins,
      endingSpins,
      totalSpins: endingSpins - startingSpins,
      wins,
      losses,
      checks: {
        spinBlockedDuringSpin: blockedSpinButtonDuringSpin,
        betBlockedDuringSpin: blockedBetChangeDuringSpin,
        balanceChangesAfterResultOnly,
        noToastOverlap,
        winningLinesMatchResults: winningLineVisibleOnWins,
        doubleTapBlocked,
        noRealApiCalls: disallowedCalls.length === 0,
      },
      disallowedCalls,
      apiCallsCount: apiRequests.length,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const viewportResults = [];
  for (const viewport of VIEWPORTS) {
    // eslint-disable-next-line no-await-in-loop
    const result = await runViewportVisual(viewport.browser, viewport);
    viewportResults.push(result);
  }
  const functional = await runFunctionalSpins();
  const report = {
    baseUrl: BASE_URL,
    previewPath: PREVIEW_PATH,
    createdAt: new Date().toISOString(),
    viewportResults,
    functional,
  };
  const reportPath = path.join(OUTPUT_DIR, "validation-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Validation report saved to ${reportPath}`);
}

main().catch((error) => {
  console.error("Slot preview validation failed.");
  console.error(error);
  process.exitCode = 1;
});
