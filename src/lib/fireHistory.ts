// Historical CAL FIRE incidents (2013–2019) from src/data/California_Fire_Incidents.csv,
// summarized per county so the app can show a household when fires usually start where
// they live and how big they have been.
//
// Quirks of the source file this module handles:
// - A fire that burned in several counties appears once per county, with the same
//   UniqueId and the fire's *total* acreage on every row. County views count it in each
//   county it reached; statewide totals count it once.
// - Some rows have a placeholder start date (1969-12-31, the Unix epoch), so their month
//   is unknown; they still count toward totals but not toward the fire season.
// - A few rows are outside California ("Mexico", "State of Nevada"); they're dropped.

import { CA_COUNTIES } from "./household";

export type Incident = {
  id: string;
  name: string;
  year: number;
  /** 0 = January … 11 = December; null when the source start date is a placeholder. */
  month: number | null;
  acres: number;
  structuresDestroyed: number;
  fatalities: number;
  location: string;
  /** CAL FIRE incident page, when the source row has one. */
  url: string | null;
};

export type FireHistory = {
  years: [number, number];
  /** Incidents per California county (a multi-county fire is listed under each). */
  byCounty: Map<string, Incident[]>;
  /** Every California incident exactly once, for statewide totals. */
  statewide: Incident[];
};

export type FireSeason = {
  /** First and last month (0–11) of the shortest run of months holding most fire starts. May wrap past December. */
  start: number;
  end: number;
  /** Share of fire starts (with a known month) that fall inside the season, 0–1. */
  share: number;
  peak: number;
  /** The month to be fully prepared by: the month before the season starts. */
  readyBy: number;
};

export type HistorySummary = {
  fires: number;
  acres: number;
  structuresDestroyed: number;
  fatalities: number;
  byMonth: number[];
  byYear: { year: number; fires: number; acres: number }[];
  largest: Incident[];
  /** null when there are too few fires to describe a season honestly. */
  season: FireSeason | null;
  /** County rank by number of fires (1 = most), among all 58 counties; null statewide. */
  rank: number | null;
  counties: number;
  // Deeper analytics, used by the county comparison.
  avgPerYear: number;
  /** Median size of fires with a recorded acreage; null when there are none. */
  medianAcres: number | null;
  /** Fires per SIZE_CLASSES bucket (fires without a recorded acreage are left out). */
  bySize: number[];
  /** Fires with a recorded acreage, the denominator for bySize and largeShare. */
  sized: number;
  /** Share of sized fires that reached LARGE_FIRE_ACRES or more, 0–1. */
  largeShare: number | null;
  /** The fire that destroyed the most structures; null when none destroyed any. */
  mostDestructive: Incident | null;
  trend: Trend;
};

/** Early vs late years of the archive, averaged so one unusual year doesn't dominate. */
export type Trend = { earlyLabel: string; lateLabel: string; early: number; late: number; /** Fractional change, null when the early average is 0. */ change: number | null };

/** Fire size groups in acres: [lower bound, label]. Each group runs up to the next bound. */
export const SIZE_CLASSES: [number, string][] = [[0, "Under 100"], [100, "100–999"], [1_000, "1K–9.9K"], [10_000, "10K–99.9K"], [100_000, "100K+"]];
/** CAL FIRE commonly reports fires of this size as large; used for "fires that grew large". */
export const LARGE_FIRE_ACRES = 1_000;
/** Years averaged at each end of the archive for the trend. */
const TREND_YEARS = 3;

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The season is the shortest run of months containing at least this share of fire starts. */
const SEASON_SHARE = 0.8;
/** Below this many dated fires a "season" would be noise, so none is reported. */
const MIN_FIRES_FOR_SEASON = 8;
const CALFIRE_SITE = "https://www.fire.ca.gov";
const CALIFORNIA = new Set(CA_COUNTIES);

// Minimal RFC 4180 CSV parser: handles quoted fields containing commas, newlines, and
// doubled quotes (several SearchKeywords values span lines).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const num = (value: string | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function buildHistory(csv: string): FireHistory {
  const [header, ...records] = parseCsv(csv);
  const col = Object.fromEntries(header.map((name, i) => [name.trim(), i]));
  const byCounty = new Map<string, Incident[]>();
  const statewide = new Map<string, Incident>();
  const seen = new Set<string>(); // id + county, in case a row is repeated outright
  let minYear = Infinity, maxYear = -Infinity;

  for (const r of records) {
    const county = r[col.Counties]?.trim();
    const id = r[col.UniqueId]?.trim();
    if (!county || !id || !CALIFORNIA.has(county) || seen.has(`${id}|${county}`)) continue;
    seen.add(`${id}|${county}`);

    const started = r[col.Started] ?? "";
    const year = Number(r[col.ArchiveYear]) || Number(started.slice(0, 4));
    // Placeholder dates sit decades before the archive year; don't trust their month.
    const month = started.startsWith(String(year)) ? Number(started.slice(5, 7)) - 1 : null;
    const path = r[col.CanonicalUrl]?.trim();
    const incident: Incident = {
      id, year, month,
      name: r[col.Name]?.trim() || "Unnamed fire",
      acres: num(r[col.AcresBurned]),
      structuresDestroyed: num(r[col.StructuresDestroyed]),
      fatalities: num(r[col.Fatalities]),
      location: r[col.Location]?.trim() ?? "",
      url: path ? `${CALFIRE_SITE}${path}` : null,
    };
    minYear = Math.min(minYear, year);
    maxYear = Math.max(maxYear, year);
    if (!byCounty.has(county)) byCounty.set(county, []);
    byCounty.get(county)!.push(incident);
    if (!statewide.has(id)) statewide.set(id, incident);
  }
  return { years: [minYear, maxYear], byCounty, statewide: [...statewide.values()] };
}

// Shortest run of consecutive months (wrapping Dec→Jan, which matters for Southern
// California's late-autumn Santa Ana fires) that holds SEASON_SHARE of fire starts.
function fireSeason(byMonth: number[]): FireSeason | null {
  const total = byMonth.reduce((a, b) => a + b, 0);
  if (total < MIN_FIRES_FOR_SEASON) return null;
  let best: { start: number; length: number; count: number } | null = null;
  for (let length = 1; length <= 12 && !best; length++) {
    for (let start = 0; start < 12; start++) {
      let count = 0;
      for (let k = 0; k < length; k++) count += byMonth[(start + k) % 12];
      // Among equally short windows, keep the one that covers the most fires.
      if (count >= total * SEASON_SHARE && (!best || count > best.count)) best = { start, length, count };
    }
  }
  if (!best) return null;
  const peak = byMonth.indexOf(Math.max(...byMonth));
  return {
    start: best.start,
    end: (best.start + best.length - 1) % 12,
    share: best.count / total,
    peak,
    readyBy: (best.start + 11) % 12,
  };
}

/** Is `month` inside a season that may wrap past December? */
export function inSeason(season: FireSeason, month: number) {
  return season.start <= season.end ? month >= season.start && month <= season.end : month >= season.start || month <= season.end;
}

/** Summary for one county, or for all of California when `county` is empty. */
export function summarize(history: FireHistory, county: string): HistorySummary {
  const incidents = county ? history.byCounty.get(county) ?? [] : history.statewide;
  const byMonth = Array<number>(12).fill(0);
  const years = new Map<number, { fires: number; acres: number }>();
  for (let y = history.years[0]; y <= history.years[1]; y++) years.set(y, { fires: 0, acres: 0 });
  let acres = 0, structuresDestroyed = 0, fatalities = 0;

  for (const f of incidents) {
    if (f.month != null) byMonth[f.month]++;
    const y = years.get(f.year);
    if (y) { y.fires++; y.acres += f.acres; }
    acres += f.acres;
    structuresDestroyed += f.structuresDestroyed;
    fatalities += f.fatalities;
  }

  // Rank counties by fire count; counties with no recorded fires share the last place.
  let rank: number | null = null;
  if (county) {
    const mine = incidents.length;
    rank = 1 + CA_COUNTIES.filter((c) => (history.byCounty.get(c)?.length ?? 0) > mine).length;
  }

  // Size profile: only fires with a recorded acreage (0 in the source means unknown).
  const sizes = incidents.map((f) => f.acres).filter((a) => a > 0).sort((a, b) => a - b);
  const bySize = SIZE_CLASSES.map(([lo], i) => sizes.filter((a) => a >= lo && (i === SIZE_CLASSES.length - 1 || a < SIZE_CLASSES[i + 1][0])).length);
  const mid = sizes.length >> 1;
  const medianAcres = sizes.length ? (sizes.length % 2 ? sizes[mid] : (sizes[mid - 1] + sizes[mid]) / 2) : null;

  const byYear = [...years].map(([year, v]) => ({ year, ...v }));
  const avg = (list: typeof byYear) => list.reduce((a, y) => a + y.fires, 0) / list.length;
  const early = byYear.slice(0, TREND_YEARS), late = byYear.slice(-TREND_YEARS);
  const span = (list: typeof byYear) => `${list[0].year}–${String(list[list.length - 1].year).slice(2)}`;
  const trend: Trend = {
    earlyLabel: span(early), lateLabel: span(late),
    early: avg(early), late: avg(late),
    change: avg(early) ? avg(late) / avg(early) - 1 : null,
  };

  return {
    fires: incidents.length,
    acres, structuresDestroyed, fatalities, byMonth, byYear,
    largest: [...incidents].sort((a, b) => b.acres - a.acres).slice(0, 5),
    season: fireSeason(byMonth),
    rank,
    counties: CA_COUNTIES.length,
    avgPerYear: incidents.length / byYear.length,
    medianAcres, bySize,
    sized: sizes.length,
    largeShare: sizes.length ? sizes.filter((a) => a >= LARGE_FIRE_ACRES).length / sizes.length : null,
    mostDestructive: incidents.reduce<Incident | null>((m, f) => (f.structuresDestroyed > (m?.structuresDestroyed ?? 0) ? f : m), null),
    trend,
  };
}

// Plain-language findings for a two-county comparison, most decision-relevant first:
// when to be ready, how often fires happen, how large they get, and what they destroyed.
// Each finding only appears when the data supports it (enough fires, a real difference).
export function compareInsights(a: HistorySummary, b: HistorySummary, nameA: string, nameB: string, statewide: HistorySummary): string[] {
  const out: string[] = [];
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  // "2.2× as many fires as" for big gaps, "35% more fires than" for smaller ones.
  const more = (x: number, noun: string) => (x >= 1.95 ? `${x.toFixed(1).replace(/\.0$/, "")}× as many ${noun} as` : `${Math.round((x - 1) * 100)}% more ${noun} than`);

  if (a.season && b.season) {
    // Months between season starts, taking the shorter way around the calendar.
    const diff = ((b.season.start - a.season.start + 18) % 12) - 6;
    out.push(diff === 0
      ? `Both counties' fire seasons start in ${MONTHS_LONG[a.season.start]}, so both should be ready by the end of ${MONTHS_LONG[a.season.readyBy]}.`
      : `${diff > 0 ? nameA : nameB}'s fire season starts ${Math.abs(diff)} month${Math.abs(diff) === 1 ? "" : "s"} earlier (${MONTHS_LONG[(diff > 0 ? a : b).season!.start]} vs ${MONTHS_LONG[(diff > 0 ? b : a).season!.start]}), so households there need to be ready sooner.`);
  }

  if (a.fires && b.fires && a.fires !== b.fires) {
    const [hi, lo, hiName, loName] = a.fires > b.fires ? [a, b, nameA, nameB] : [b, a, nameB, nameA];
    out.push(`${hiName} recorded ${more(hi.fires / lo.fires, "fires")} ${loName} (${hi.fires.toLocaleString()} vs ${lo.fires.toLocaleString()}, about ${hi.avgPerYear.toFixed(1)} vs ${lo.avgPerYear.toFixed(1)} a year).`);
  } else if (!a.fires !== !b.fires) {
    out.push(`${a.fires ? nameB : nameA} has no CAL FIRE incidents recorded in this period, while ${a.fires ? nameA : nameB} recorded ${(a.fires || b.fires).toLocaleString()}.`);
  }

  if (a.largeShare != null && b.largeShare != null && a.sized >= 5 && b.sized >= 5 && Math.abs(a.largeShare - b.largeShare) >= 0.05) {
    const [hi, lo, hiName, loName] = a.largeShare > b.largeShare ? [a, b, nameA, nameB] : [b, a, nameB, nameA];
    out.push(`Fires in ${hiName} were more likely to grow large: ${pct(hi.largeShare!)} reached ${LARGE_FIRE_ACRES.toLocaleString()}+ acres, compared with ${pct(lo.largeShare!)} in ${loName}.`);
  }

  if (a.structuresDestroyed + b.structuresDestroyed > 0) {
    const [hi, lo, hiName, loName] = a.structuresDestroyed >= b.structuresDestroyed ? [a, b, nameA, nameB] : [b, a, nameB, nameA];
    const top = hi.mostDestructive;
    const share = top && hi.structuresDestroyed ? top.structuresDestroyed / hi.structuresDestroyed : 0;
    out.push(`${hiName} lost ${hi.structuresDestroyed.toLocaleString()} structures vs ${lo.structuresDestroyed.toLocaleString()} in ${loName}${top && share >= 0.5 ? `, ${pct(share)} of them in a single fire (${top.name}, ${top.year}). One extreme fire can outweigh years of smaller ones` : ""}.`);
  }

  // Trends are compared with the statewide trend, because the number of incidents CAL FIRE
  // published grew over these years; outpacing the state is the meaningful signal.
  const st = statewide.trend.change;
  for (const [s, name] of [[a, nameA], [b, nameB]] as const) {
    if (s.trend.change == null || st == null || s.fires < 15) continue;
    const gap = s.trend.change - st;
    if (Math.abs(gap) < 0.25) continue;
    out.push(`${name}'s fires per year changed ${s.trend.change >= 0 ? "+" : ""}${pct(s.trend.change)} from ${s.trend.earlyLabel} to ${s.trend.lateLabel}, ${gap > 0 ? "faster than" : "slower than"} California overall (${st >= 0 ? "+" : ""}${pct(st)}).`);
  }
  return out;
}

// The CSV is ~1 MB, so it's loaded on demand as its own chunk (Vite's ?raw import)
// rather than shipped in the main bundle; it's parsed once and cached.
let cached: Promise<FireHistory> | null = null;
export function loadFireHistory(): Promise<FireHistory> {
  cached ??= import("../data/California_Fire_Incidents.csv?raw").then((m) => buildHistory(m.default));
  cached.catch(() => { cached = null; }); // allow a retry after a failed chunk load
  return cached;
}
