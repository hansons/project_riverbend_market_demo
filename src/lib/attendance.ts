import { supabase } from '@/lib/supabase';
import type { AttendanceForecast, ForecastComponent, MarketDate, MarketDayStat } from '@/lib/types';

// Market-day attendance (0020). Admin-only via RLS. Actuals are recorded by hand
// (helped by proxy hints in the UI); the forecast below is a transparent heuristic
// computed client-side so the admin can see exactly what drives the number.

export async function fetchAttendance(): Promise<MarketDayStat[]> {
  const { data } = await supabase.from('market_day_stats').select('*').order('market_date', { ascending: false });
  return (data as MarketDayStat[]) ?? [];
}

export interface AttendanceInput {
  market_id: string | null;
  market_date: string;
  attendance: number | null;
  method: string | null;
  weather: string | null;
  notes: string | null;
  recorded_by: string | null;
}

export async function recordAttendance(a: AttendanceInput): Promise<string | null> {
  const { error } = await supabase.from('market_day_stats').upsert(a, { onConflict: 'market_id,market_date' });
  return error?.message ?? null;
}

/** date → number of confirmed vendors that day (forecast supply signal + a hint). */
export async function fetchConfirmedCounts(): Promise<Record<string, number>> {
  const { data } = await supabase.from('vendor_schedule').select('status, market_dates(date)').eq('status', 'confirmed');
  const rows = (data as unknown as { market_dates: { date: string } | null }[]) ?? [];
  const out: Record<string, number> = {};
  for (const r of rows) {
    const d = r.market_dates?.date;
    if (d) out[d] = (out[d] ?? 0) + 1;
  }
  return out;
}

/** date → number of events/programming scheduled that day (forecast demand booster). */
export async function fetchEventCounts(): Promise<Record<string, number>> {
  const { data } = await supabase.from('events').select('date');
  const rows = (data as { date: string }[]) ?? [];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.date] = (out[r.date] ?? 0) + 1;
  return out;
}

const DAY = 86_400_000;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const pct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 100)}%`;

/**
 * Transparent attendance forecast: blend(same-week-last-year, recent average),
 * then nudge by vendor turnout, scheduled events, and special-date label. Every
 * term is surfaced as a component so the estimate is explainable, not a black box.
 */
export function computeForecast(args: {
  target: MarketDate;
  history: MarketDayStat[];
  confirmedByDate: Record<string, number>;
  eventCountByDate: Record<string, number>;
}): AttendanceForecast {
  const { target, history, confirmedByDate, eventCountByDate } = args;

  const sameMarket = history
    .filter((h) => h.market_id === target.market_id && h.attendance != null && h.market_date < target.date)
    .sort((a, b) => b.market_date.localeCompare(a.market_date));

  const components: ForecastComponent[] = [];

  const trailing = sameMarket.slice(0, 4);
  const trailingAvg = trailing.length
    ? Math.round(trailing.reduce((s, h) => s + (h.attendance ?? 0), 0) / trailing.length)
    : null;

  // Same week last year: nearest actual within ±10 days of (target − 364 days).
  const lastYearMs = Date.parse(target.date) - 364 * DAY;
  let lastYear: MarketDayStat | null = null;
  let bestDelta = 11 * DAY;
  for (const h of sameMarket) {
    const d = Math.abs(Date.parse(h.market_date) - lastYearMs);
    if (d <= 10 * DAY && d < bestDelta) {
      bestDelta = d;
      lastYear = h;
    }
  }

  let baseline: number | null = null;
  if (lastYear && trailingAvg != null) {
    baseline = Math.round(0.5 * (lastYear.attendance ?? 0) + 0.5 * trailingAvg);
    components.push({ label: 'Same week last year', detail: `${lastYear.attendance} on ${lastYear.market_date} · weight 50%` });
    components.push({ label: 'Recent average', detail: `${trailingAvg} over last ${trailing.length} · weight 50%` });
  } else if (trailingAvg != null) {
    baseline = trailingAvg;
    components.push({ label: 'Recent average', detail: `${trailingAvg} over last ${trailing.length} market(s)` });
  } else if (lastYear) {
    baseline = lastYear.attendance ?? null;
    components.push({ label: 'Same week last year', detail: `${lastYear.attendance} on ${lastYear.market_date}` });
  }

  if (baseline == null) {
    return {
      forecast: null,
      low: null,
      high: null,
      basis: 0,
      confidence: 'low',
      components: [{ label: 'Not enough history', detail: 'Record a few actuals for this market to enable the forecast.' }],
    };
  }

  let adjPct = 0;

  const confirmed = confirmedByDate[target.date];
  if (confirmed != null) {
    const vals = Object.values(confirmedByDate);
    const typical = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : confirmed;
    const vPct = clamp(typical ? (confirmed / typical - 1) * 0.4 : 0, -0.15, 0.15);
    adjPct += vPct;
    components.push({ label: 'Vendor turnout', detail: `${confirmed} confirmed vs ~${Math.round(typical)} typical · ${pct(vPct)}` });
  }

  const ev = eventCountByDate[target.date] ?? 0;
  if (ev > 0) {
    const ePct = Math.min(ev * 0.08, 0.24);
    adjPct += ePct;
    components.push({ label: 'Events / programming', detail: `${ev} scheduled · ${pct(ePct)}` });
  }

  if (target.label) {
    adjPct += 0.15;
    components.push({ label: 'Special date', detail: `${target.label} · +15%` });
  }

  adjPct = clamp(adjPct, -0.2, 0.4);
  const forecast = Math.round(baseline * (1 + adjPct));
  return {
    forecast,
    low: Math.round(forecast * 0.85),
    high: Math.round(forecast * 1.15),
    basis: sameMarket.length,
    confidence: sameMarket.length >= 6 ? 'medium' : 'low',
    components,
  };
}
