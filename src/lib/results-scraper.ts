import {

  ALTERNATE_SOURCE_BASE,

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

  Accept: "text/html",

};



function padNum(n: string) {

  const v = n.trim();

  if (!/^\d{1,2}$/.test(v)) return null;

  return v.padStart(2, "0");

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



async function fetchHtml(url: string) {

  const res = await fetch(url, { headers: FETCH_HEADERS, next: { revalidate: 0 } });

  if (!res.ok) return null;

  return res.text();

}



/** Paso 1: consulta la fuente oficial (loteriasdominicanas.com). */

export async function fetchOfficialSource(

  sourcePath: string,

  day: Date

): Promise<ScrapedQuiniela | null> {

  const date = queryDateInTz(day);

  const html = await fetchHtml(`${OFFICIAL_SOURCE_BASE}${sourcePath}?date=${date}`);

  if (!html) return null;

  return parseQuinielaBlocks(html, true)[0] ?? null;

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

    const html = await fetchHtml(`${ALTERNATE_SOURCE_BASE}?date=${dateKey}`);

    if (!html) return null;



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

  const official = await fetchOfficialSource(config.officialPath, day);



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


