import {
  ALTERNATE_SOURCE_BASE,
  OFFICIAL_API_BASE,
  OFFICIAL_SOURCE_BASE,
  type LotterySourceConfig,
} from "./lottery-sources";
import { queryDateInTz, TZ } from "./timezone";
import { formatInTimeZone } from "date-fns-tz";

export type ScrapedQuiniela = {
  first: string;
  second: string;
  third: string;
  sessionDate: string;
  label?: string;
};

const FETCH_HEADERS = {
  "User-Agent": "LaDicha/1.0 (+verificacion dual de resultados)",
  Accept: "text/html,application/json",
};

const FETCH_TIMEOUT_MS = 20_000;

function padNum(n: string) {
  const v = n.trim();
  if (!/^\d{1,2}$/.test(v)) return null;
  return v.padStart(2, "0");
}

function sessionDateLabel(day: Date) {
  const d = Number(formatInTimeZone(day, TZ, "d"));
  const m = Number(formatInTimeZone(day, TZ, "M"));
  return `${d}-${m}`;
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...FETCH_HEADERS, ...init?.headers },
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function parseQuinielaBlocks(html: string, takeFirst = true): ScrapedQuiniela[] {
  const blocks = html.split('class="game-block').slice(1);
  const slice = takeFirst ? blocks.slice(0, 1) : blocks;
  const rows: ScrapedQuiniela[] = [];

  for (const block of slice) {
    const label = block.match(/game-title[\s\S]*?<span[^>]*>([^<]+)<\/span>/)?.[1]?.trim();
    const sessionDate = block.match(/session-date[^>]*>\s*([^<\s]+)/)?.[1]?.trim() ?? "";
    const nums = [...block.matchAll(/class="score[^"]*"[\s\S]*?(\d{1,2})/g)]
      .slice(0, 3)
      .map((m) => padNum(m[1]))
      .filter((n): n is string => n !== null);

    if (nums.length !== 3) continue;
    rows.push({
      label,
      first: nums[0],
      second: nums[1],
      third: nums[2],
      sessionDate,
    });
  }

  return rows;
}

function parseAllQuinielaBlocks(html: string): ScrapedQuiniela[] {
  return parseQuinielaBlocks(html, false);
}

type OfficialApiSession = {
  date?: string;
  score?: unknown;
};

type OfficialApiSiteGame = {
  title?: string;
  game?: {
    sessions?: OfficialApiSession[];
  };
};

function flattenScore(score: unknown): string[] {
  if (!Array.isArray(score) || score.length === 0) return [];
  const first = score[0];
  if (Array.isArray(first)) {
    return first.map((n) => String(n).trim()).filter(Boolean);
  }
  return score.map((n) => String(n).trim()).filter(Boolean);
}

function parseOfficialApiSession(
  session: OfficialApiSession,
  day: Date,
  label?: string
): ScrapedQuiniela | null {
  if (!session.date) return null;
  const sessionDay = new Date(session.date);
  const targetDay = Number(formatInTimeZone(day, TZ, "d"));
  const targetMonth = Number(formatInTimeZone(day, TZ, "M"));
  const sessionDayNum = Number(formatInTimeZone(sessionDay, TZ, "d"));
  const sessionMonthNum = Number(formatInTimeZone(sessionDay, TZ, "M"));
  if (sessionDayNum !== targetDay || sessionMonthNum !== targetMonth) return null;

  const nums = flattenScore(session.score)
    .slice(0, 3)
    .map((n) => padNum(n))
    .filter((n): n is string => n !== null);
  if (nums.length !== 3) return null;

  return {
    label,
    first: nums[0],
    second: nums[1],
    third: nums[2],
    sessionDate: sessionDateLabel(sessionDay),
  };
}

async function fetchOfficialFromApi(
  config: LotterySourceConfig,
  day: Date
): Promise<ScrapedQuiniela | null> {
  const res = await fetchWithTimeout(
    `${OFFICIAL_API_BASE}/site-games/${config.officialSiteGameId}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res) return null;

  let payload: OfficialApiSiteGame;
  try {
    payload = (await res.json()) as OfficialApiSiteGame;
  } catch {
    return null;
  }

  const sessions = payload.game?.sessions ?? [];
  for (const session of sessions) {
    const parsed = parseOfficialApiSession(session, day, config.officialName);
    if (parsed) return parsed;
  }

  return null;
}

async function fetchOfficialFromHtml(
  sourcePath: string,
  day: Date,
  label?: string
): Promise<ScrapedQuiniela | null> {
  const date = queryDateInTz(day);
  const res = await fetchWithTimeout(`${OFFICIAL_SOURCE_BASE}${sourcePath}?date=${date}`);
  if (!res) return null;
  const html = await res.text();
  const row = parseQuinielaBlocks(html, true)[0];
  if (!row) return null;
  return { ...row, label: row.label ?? label };
}

/** Paso 1: consulta la fuente oficial (API JSON + HTML legacy). */
export async function fetchOfficialSource(
  config: LotterySourceConfig,
  day: Date
): Promise<ScrapedQuiniela | null> {
  const fromApi = await fetchOfficialFromApi(config, day);
  if (fromApi) return fromApi;
  return fetchOfficialFromHtml(config.officialPath, day, config.officialName);
}

const alternateDayCache = new Map<string, Map<string, ScrapedQuiniela>>();

/** Paso 2: consulta la fuente alterna (conectate.com.do) para confirmar. */
export async function fetchAlternateSource(
  alternateName: string,
  day: Date
): Promise<ScrapedQuiniela | null> {
  const dateKey = queryDateInTz(day);
  let dayMap = alternateDayCache.get(dateKey);

  if (!dayMap) {
    const res = await fetchWithTimeout(`${ALTERNATE_SOURCE_BASE}?date=${dateKey}`);
    if (!res) return null;
    const html = await res.text();

    dayMap = new Map();
    for (const row of parseAllQuinielaBlocks(html)) {
      if (row.label) dayMap.set(row.label, row);
    }
    alternateDayCache.set(dateKey, dayMap);
  }

  return dayMap.get(alternateName) ?? null;
}

export function clearAlternateSourceCache() {
  alternateDayCache.clear();
}

/** Valida que la fecha del sorteo coincida con el día solicitado (dd-mm). */
export function sessionMatchesDay(sessionDate: string, day: Date): boolean {
  const parts = sessionDate.split("-").map((p) => p.trim());
  if (parts.length < 2) return false;

  const sessionDay = Number(parts[0]);
  const sessionMonth = Number(parts[1]);
  const targetDay = Number(formatInTimeZone(day, TZ, "d"));
  const targetMonth = Number(formatInTimeZone(day, TZ, "M"));

  return sessionDay === targetDay && sessionMonth === targetMonth;
}

export function numbersKey(r: Pick<ScrapedQuiniela, "first" | "second" | "third">) {
  return `${r.first}-${r.second}-${r.third}`;
}

export type VerifiedFetchResult =
  | { ok: true; data: ScrapedQuiniela }
  | {
      ok: false;
      reason:
        | "official_missing"
        | "official_date"
        | "alternate_missing"
        | "alternate_date"
        | "mismatch";
      detail?: string;
    };

/**
 * 1. Busca primero en la fuente oficial (loteriasdominicanas.com).
 * 2. Si no hay resultado o la fecha no cuadra, detiene ahí.
 * 3. Solo entonces consulta conectate.com.do para confirmar.
 * 4. Sube solo si ambas coinciden.
 */
export async function fetchVerifiedQuiniela(
  config: LotterySourceConfig,
  day: Date
): Promise<VerifiedFetchResult> {
  const official = await fetchOfficialSource(config, day);

  if (!official) {
    return { ok: false, reason: "official_missing", detail: "sin resultado en fuente oficial" };
  }

  if (!sessionMatchesDay(official.sessionDate, day)) {
    return {
      ok: false,
      reason: "official_date",
      detail: `oficial muestra ${official.sessionDate}, esperado día ${queryDateInTz(day)}`,
    };
  }

  const alternate = await fetchAlternateSource(config.alternateName, day);

  if (!alternate) {
    return {
      ok: false,
      reason: "alternate_missing",
      detail: "oficial OK, falta confirmar en conectate.com.do",
    };
  }

  if (!sessionMatchesDay(alternate.sessionDate, day)) {
    return {
      ok: false,
      reason: "alternate_date",
      detail: `alterna muestra ${alternate.sessionDate}`,
    };
  }

  if (numbersKey(official) !== numbersKey(alternate)) {
    return {
      ok: false,
      reason: "mismatch",
      detail: `oficial ${numbersKey(official)} vs alterna ${numbersKey(alternate)}`,
    };
  }

  return { ok: true, data: official };
}
