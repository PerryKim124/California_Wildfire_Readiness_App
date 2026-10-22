import { useEffect, useState } from "react";
import { CA_COUNTIES, useHousehold } from "./lib/household";
import { LARGE_FIRE_ACRES, MONTHS, MONTHS_LONG, SIZE_CLASSES, compareInsights, inSeason, loadFireHistory, summarize, type FireHistory, type FireSeason, type HistorySummary } from "./lib/fireHistory";

/** "Compare with" value for the statewide figures ("" means no comparison). */
const STATEWIDE = "*";

const whole = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const plural = (n: number, word: string, many = `${word}s`) => `${whole.format(n)} ${n === 1 ? word : many}`;
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;

function seasonRange(s: FireSeason) {
  return s.start === s.end ? MONTHS_LONG[s.start] : `${MONTHS_LONG[s.start]} through ${MONTHS_LONG[s.end]}`;
}

type Bar = { label: string; value: number; tooltip: string; muted?: boolean };

// Single-series bar chart drawn with plain elements. Each column is focusable and
// shows a tooltip on hover or keyboard focus; the "Show as table" toggle gives the
// same numbers without relying on the bars or their color.
function BarChart({ title, caption, bars, labelHeading, unit }: { title: string; caption: string; bars: Bar[]; labelHeading: string; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...bars.map((b) => b.value));
  return <figure className="history-chart">
    <figcaption><div><b>{title}</b><span>{caption}</span></div><button className="text-button" onClick={() => setTable(!table)} aria-pressed={table}>{table ? "Show chart" : "Show as table"}</button></figcaption>
    {table
      ? <table className="history-table"><thead><tr><th scope="col">{labelHeading}</th><th scope="col">{unit}</th></tr></thead><tbody>{bars.map((b) => <tr key={b.label}><th scope="row">{b.label}</th><td>{whole.format(b.value)}</td></tr>)}</tbody></table>
      : <div className="history-bars" role="list" onMouseLeave={() => setActive(null)}>
        {bars.map((b, i) => <div key={b.label} className="history-col" role="listitem" tabIndex={0} aria-label={b.tooltip}
          onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
          <div className="history-track">
            {active === i && <div className="history-tip" role="tooltip">{b.tooltip}</div>}
            <i className={b.muted ? "muted" : ""} style={{ height: b.value ? `max(4px, ${(b.value / max) * 100}%)` : 0 }}/>
          </div>
          <span>{b.label}</span>
        </div>)}
      </div>}
  </figure>;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="history-stat"><span>{label}</span><b>{value}</b>{note && <small>{note}</small>}</div>;
}

// The actionable takeaway: when fires usually start here, and the month to be ready by.
function SeasonCallout({ summary, place }: { summary: HistorySummary; place: string }) {
  const s = summary.season;
  if (summary.fires === 0) return <div className="history-callout calm"><b>No CAL FIRE incidents recorded in {place} in this period.</b><span>That doesn't mean zero risk: smoke, nearby fires, and fires handled by other agencies still affect households here. Keep your go-bag and contacts current.</span></div>;
  if (!s) return <div className="history-callout calm"><b>{plural(summary.fires, "fire")} recorded in {place}: too few to show a reliable fire season.</b><span>Fires can start in any month. Keep your go-bag and evacuation plan ready year-round.</span></div>;
  return <div className="history-callout">
    <b>Be ready by the end of {MONTHS_LONG[s.readyBy]}.</b>
    <span>In {place}, {Math.round(s.share * 100)}% of fires started from {seasonRange(s)}, with the most in {MONTHS_LONG[s.peak]}. Finish your go-bag, defensible space, and evacuation plan before the season begins.</span>
  </div>;
}

type Series = { name: string; values: number[]; counts: number[] };

// Two-county grouped bar chart. Bars show each county's *share* of its own fires, so a
// county with 60 fires and one with 1,600 can be compared by shape, not volume. Tooltips
// and the table view also give the underlying fire counts.
function GroupedBarChart({ title, caption, labels, labelHeading, series }: { title: string; caption: string; labels: string[]; labelHeading: string; series: [Series, Series] }) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(0.01, ...series.flatMap((s) => s.values));
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const describe = (i: number) => `${labels[i]}: ${series.map((s) => `${s.name} ${pct(s.values[i])} (${plural(s.counts[i], "fire")})`).join(" · ")}`;
  return <figure className="history-chart">
    <figcaption><div><b>{title}</b><span>{caption}</span></div><button className="text-button" onClick={() => setTable(!table)} aria-pressed={table}>{table ? "Show chart" : "Show as table"}</button></figcaption>
    {table
      ? <table className="history-table"><thead><tr><th scope="col">{labelHeading}</th>{series.map((s) => <th scope="col" key={s.name}>{s.name}</th>)}</tr></thead>
        <tbody>{labels.map((l, i) => <tr key={l}><th scope="row">{l}</th>{series.map((s) => <td key={s.name}>{pct(s.values[i])} <small>({whole.format(s.counts[i])})</small></td>)}</tr>)}</tbody></table>
      : <div className="history-bars" role="list" onMouseLeave={() => setActive(null)}>
        {labels.map((l, i) => <div key={l} className="history-col" role="listitem" tabIndex={0} aria-label={describe(i)}
          onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
          <div className="history-track grouped">
            {active === i && <div className="history-tip" role="tooltip">{labels[i]}{series.map((s, k) => <span key={s.name}><i className={`cmp-swatch cmp-${k ? "b" : "a"}`}/>{s.name}: {pct(s.values[i])} ({plural(s.counts[i], "fire")})</span>)}</div>}
            {series.map((s, k) => <i key={s.name} className={`cmp-${k ? "b" : "a"}`} style={{ height: s.values[i] ? `max(3px, ${(s.values[i] / max) * 100}%)` : 0 }}/>)}
          </div>
          <span>{l}</span>
        </div>)}
      </div>}
  </figure>;
}

const shortSeason = (s: FireSeason | null) => (s ? `${MONTHS[s.start]}–${MONTHS[s.end]} (${Math.round(s.share * 100)}%)` : "Too few fires");
const signedPct = (x: number | null) => (x == null ? "—" : `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`);

// Side-by-side figures for two places. The larger of two numeric values is emphasized so
// differences stand out; "larger" isn't labeled better or worse, since that depends on the row.
function ComparisonTable({ a, b, nameA, nameB }: { a: HistorySummary; b: HistorySummary; nameA: string; nameB: string }) {
  const rows: [string, (s: HistorySummary) => string, ((s: HistorySummary) => number | null)?][] = [
    ["Fires recorded", (s) => whole.format(s.fires), (s) => s.fires],
    ["Average fires per year", (s) => s.avgPerYear.toFixed(1), (s) => s.avgPerYear],
    ["Rank among 58 counties", (s) => (s.rank ? ordinal(s.rank) : "—")],
    ["Acres burned", (s) => compact.format(s.acres), (s) => s.acres],
    ["Median fire size", (s) => (s.medianAcres == null ? "—" : `${whole.format(Math.round(s.medianAcres))} acres`), (s) => s.medianAcres],
    [`Fires reaching ${whole.format(LARGE_FIRE_ACRES)}+ acres`, (s) => (s.largeShare == null ? "—" : `${Math.round(s.largeShare * 100)}%`), (s) => s.largeShare],
    ["Largest fire", (s) => (s.largest[0] ? `${s.largest[0].name} (${s.largest[0].year}), ${compact.format(s.largest[0].acres)} acres` : "—"), (s) => s.largest[0]?.acres ?? null],
    ["Structures destroyed", (s) => whole.format(s.structuresDestroyed), (s) => s.structuresDestroyed],
    ["Fatalities", (s) => whole.format(s.fatalities), (s) => s.fatalities],
    ["Fire season (share of fires)", (s) => shortSeason(s.season)],
    ["Peak month", (s) => (s.season ? MONTHS_LONG[s.season.peak] : "—")],
    ["Be ready by end of", (s) => (s.season ? MONTHS_LONG[s.season.readyBy] : "Year-round")],
    [`Fires per year, ${a.trend.earlyLabel} → ${a.trend.lateLabel}`, (s) => `${s.trend.early.toFixed(1)} → ${s.trend.late.toFixed(1)} (${signedPct(s.trend.change)})`],
  ];
  return <div className="cmp-table-wrap"><table className="cmp-table">
    <thead><tr><th scope="col"><span className="sr-only">Measure</span></th><th scope="col"><i className="cmp-swatch cmp-a"/>{nameA}</th><th scope="col"><i className="cmp-swatch cmp-b"/>{nameB}</th></tr></thead>
    <tbody>{rows.map(([label, show, value]) => {
      const va = value?.(a) ?? null, vb = value?.(b) ?? null;
      const lead = va != null && vb != null && va !== vb ? (va > vb ? 0 : 1) : -1;
      return <tr key={label}><th scope="row">{label}</th><td className={lead === 0 ? "lead" : ""}>{show(a)}</td><td className={lead === 1 ? "lead" : ""}>{show(b)}</td></tr>;
    })}</tbody>
  </table></div>;
}

function CountyComparison({ history, county, compareTo }: { history: FireHistory; county: string; compareTo: string }) {
  const otherKey = compareTo === STATEWIDE ? "" : compareTo;
  const a = summarize(history, county), b = summarize(history, otherKey);
  const nameA = county ? `${county} County` : "California", nameB = otherKey ? `${otherKey} County` : "California";
  const insights = compareInsights(a, b, nameA, nameB, summarize(history, ""));
  // Month shares use only fires with a known start month, matching the season calculation.
  const monthShare = (s: HistorySummary) => { const t = s.byMonth.reduce((x, y) => x + y, 0); return s.byMonth.map((v) => (t ? v / t : 0)); };
  const sizeShare = (s: HistorySummary) => s.bySize.map((v) => (s.sized ? v / s.sized : 0));
  return <section className="cmp" aria-labelledby="cmp-title">
    <div className="cmp-head">
      <span className="kicker">COUNTY COMPARISON</span>
      <h3 id="cmp-title">{nameA} vs {nameB}</h3>
      <div className="cmp-legend" aria-label="Legend"><span><i className="cmp-swatch cmp-a"/>{nameA}</span><span><i className="cmp-swatch cmp-b"/>{nameB}</span></div>
    </div>

    {insights.length > 0 && <div className="cmp-insights"><b>Key differences</b><ul>{insights.map((t) => <li key={t}>{t}</li>)}</ul></div>}

    <ComparisonTable a={a} b={b} nameA={nameA} nameB={nameB}/>

    {a.fires > 0 && b.fires > 0 && <div className="history-charts cmp-charts">
      <GroupedBarChart title="Fire season, compared" labelHeading="Month" caption="Share of each place's fires starting in each month"
        labels={MONTHS} series={[{ name: nameA, values: monthShare(a), counts: a.byMonth }, { name: nameB, values: monthShare(b), counts: b.byMonth }]}/>
      <GroupedBarChart title="How large fires grew" labelHeading="Acres" caption="Share of each place's fires by final size, in acres"
        labels={SIZE_CLASSES.map(([, l]) => l)} series={[{ name: nameA, values: sizeShare(a), counts: a.bySize }, { name: nameB, values: sizeShare(b), counts: b.bySize }]}/>
    </div>}
  </section>;
}

export default function FireHistoryPanel() {
  const householdCounty = useHousehold().profile.location.county;
  const [county, setCounty] = useState(householdCounty);
  const [compareTo, setCompareTo] = useState("");
  const [history, setHistory] = useState<FireHistory | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Follow the household's county when it changes (e.g. edited in Settings).
  useEffect(() => setCounty(householdCounty), [householdCounty]);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadFireHistory().then((h) => { if (!cancelled) setHistory(h); }, () => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [attempt]);

  const place = county ? `${county} County` : "California";
  const summary = history ? summarize(history, county) : null;
  const period = history ? `${history.years[0]}–${history.years[1]}` : "";

  return <section className="card fire-history" aria-labelledby="fire-history-title">
    <div className="history-head">
      <div>
        <span className="kicker">FIRE HISTORY · CAL FIRE INCIDENTS {period}</span>
        <h2 id="fire-history-title">{place} fire history</h2>
        <p>When fires have started near you, and how large they've been.{county && county === householdCounty ? " Based on your household's county." : ""}</p>
      </div>
      <div className="history-selects">
        <label className="history-select"><span>County</span>
          <select value={county} onChange={(e) => { setCounty(e.target.value); if (e.target.value === (compareTo === STATEWIDE ? "" : compareTo)) setCompareTo(""); }}>
            <option value="">All of California</option>
            {CA_COUNTIES.map((c) => <option key={c} value={c}>{c}{c === householdCounty ? " (your county)" : ""}</option>)}
          </select>
        </label>
        {/* A place can't be compared with itself, so the current selection is disabled here. */}
        <label className="history-select"><span>Compare with</span>
          <select value={compareTo} onChange={(e) => setCompareTo(e.target.value)}>
            <option value="">No comparison</option>
            <option value={STATEWIDE} disabled={!county}>All of California</option>
            {CA_COUNTIES.map((c) => <option key={c} value={c} disabled={c === county}>{c}{c === householdCounty ? " (your county)" : ""}</option>)}
          </select>
        </label>
      </div>
    </div>

    {error && <div className="fire-alert" role="alert">Couldn't load the fire history data. <button className="text-button" onClick={() => setAttempt((a) => a + 1)}>Try again</button></div>}
    {!summary && !error && <div className="history-loading" role="status">Loading fire history…</div>}

    {summary && <>
      <SeasonCallout summary={summary} place={place}/>

      <div className="history-stats">
        <Stat label="Fires recorded" value={whole.format(summary.fires)} note={summary.rank ? `${ordinal(summary.rank)} most of ${summary.counties} counties` : `across ${summary.counties} counties`}/>
        <Stat label="Acres burned" value={compact.format(summary.acres)} note={county ? "by fires that reached the county" : "statewide"}/>
        <Stat label="Structures destroyed" value={whole.format(summary.structuresDestroyed)}/>
        <Stat label="Fatalities" value={whole.format(summary.fatalities)}/>
      </div>

      {summary.fires > 0 && <div className="history-charts">
        <BarChart title="When fires start" labelHeading="Month" unit="Fires started" caption={summary.season ? "Fire starts by month · orange bars are the fire season" : "Fire starts by month"}
          bars={summary.byMonth.map((v, m) => ({ label: MONTHS[m], value: v, muted: summary.season ? !inSeason(summary.season, m) : false, tooltip: `${MONTHS_LONG[m]}: ${plural(v, "fire")} started` }))}/>
        <BarChart title="Fires per year" labelHeading="Year" unit="Fires" caption={`${period} · hover a bar for acres burned`}
          bars={summary.byYear.map((y) => ({ label: String(y.year), value: y.fires, tooltip: `${y.year}: ${plural(y.fires, "fire")}, ${whole.format(Math.round(y.acres))} acres` }))}/>
      </div>}

      {summary.largest.length > 0 && <div className="history-largest">
        <b>Largest fires{county ? ` that reached ${place}` : " in California"}</b>
        <ol>{summary.largest.map((f) => <li key={f.id}>
          <div><strong>{f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a> : f.name}</strong><span>{f.year}{f.location ? ` · ${f.location}` : ""}</span></div>
          <div className="history-fire-figures"><b>{whole.format(f.acres)} acres</b>{(f.structuresDestroyed > 0 || f.fatalities > 0) && <span>{[f.structuresDestroyed && plural(f.structuresDestroyed, "structure") + " destroyed", f.fatalities && plural(f.fatalities, "fatality", "fatalities")].filter(Boolean).join(" · ")}</span>}</div>
        </li>)}</ol>
      </div>}

      {history && compareTo && <CountyComparison history={history} county={county} compareTo={compareTo}/>}

      <p className="history-source">Source: CAL FIRE incident records, {period} (California_Fire_Incidents.csv). Covers incidents CAL FIRE published, not every fire. A fire that crossed county lines is counted in each county it reached, with its full acreage. Past fires describe local patterns; they don't predict this year's risk.</p>
    </>}
  </section>;
}
