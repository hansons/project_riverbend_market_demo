export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Current calendar month, 1–12 (drives "in season now" highlighting). */
export function currentMonth(): number {
  return new Date().getMonth() + 1;
}

/** Parse a season string into month numbers (1–12). Accepts "5-9", "5,6,7", "May-Jun", "Nov-Feb", "Jan-Mar,Oct-Dec". */
export function parseMonths(input: string): number[] {
  const s = (input ?? '').trim();
  if (!s) return [];
  const toNum = (tok: string): number | null => {
    const t = tok.trim().toLowerCase();
    if (!t) return null;
    if (/^\d+$/.test(t)) {
      const n = parseInt(t, 10);
      return n >= 1 && n <= 12 ? n : null;
    }
    const idx = MONTHS.findIndex((m) => m.toLowerCase() === t.slice(0, 3));
    return idx >= 0 ? idx + 1 : null;
  };
  const out = new Set<number>();
  for (const part of s.split(',')) {
    const range = part.split(/[-–—]/);
    if (range.length === 2) {
      const a = toNum(range[0]);
      const b = toNum(range[1]);
      if (a && b) {
        let i = a;
        for (let k = 0; k < 12; k++) {
          out.add(i);
          if (i === b) break;
          i = i === 12 ? 1 : i + 1; // wraps (e.g. Nov–Feb)
        }
      }
    } else {
      const n = toNum(part);
      if (n) out.add(n);
    }
  }
  return [...out].sort((x, y) => x - y);
}

/** Compact month list as labels, e.g. {5,6} → "May–Jun", {1,2,3,10,11,12} → "Jan–Mar, Oct–Dec". */
export function formatMonths(months: number[]): string {
  const sorted = [...new Set(months ?? [])].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
  if (!sorted.length) return '';
  const ranges: [number, number][] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) prev = sorted[i];
    else {
      ranges.push([start, prev]);
      start = prev = sorted[i];
    }
  }
  ranges.push([start, prev]);
  return ranges.map(([a, b]) => (a === b ? MONTHS[a - 1] : `${MONTHS[a - 1]}–${MONTHS[b - 1]}`)).join(', ');
}

/** Effective in-season: a scheduled product flips by month; otherwise its manual flag stands. */
export function isProductInSeason(
  p: { season_months: number[]; in_season: boolean },
  month: number = currentMonth(),
): boolean {
  return p.season_months && p.season_months.length ? p.season_months.includes(month) : p.in_season;
}

export function formatPrice(cents: number | null, unit: string | null): string {
  if (cents == null) return '';
  const dollars = (cents / 100).toFixed(2).replace(/\.00$/, '');
  return `$${dollars}${unit ? ` / ${unit}` : ''}`;
}

/** "$90.00" from cents (no unit). */
export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** "Sat, Jun 13" from an ISO date string, parsed locally (no TZ shift). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** The Saturday of the current week, as an ISO date string (offering default). */
export function thisSaturdayISO(): string {
  const now = new Date();
  const sat = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((6 - now.getDay() + 7) % 7));
  return `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, '0')}-${String(sat.getDate()).padStart(2, '0')}`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Produce: '🥬',
  Bakery: '🍞',
  Flowers: '💐',
  'Meat & Eggs': '🥩',
  'Cheese & Dairy': '🧀',
  Mushrooms: '🍄',
  'Orchard & Fruit': '🍎',
  'Prepared Foods': '🍛',
  'Honey & Preserves': '🍯',
  'Coffee & Tea': '☕',
  'Herbs & Plants': '🌿',
  Seafood: '🐟',
  'Body & Home': '🧼',
  'Nuts & Grains': '🌰',
};

export const categoryEmoji = (category: string): string => CATEGORY_EMOJI[category] ?? '🧺';

const SEASON_STYLE: Record<string, { label: string; className: string }> = {
  peak: { label: 'At peak', className: 'bg-status-ok/10 text-status-ok' },
  coming: { label: 'Coming soon', className: 'bg-status-info/10 text-status-info' },
  ending: { label: 'Last call', className: 'bg-status-warn/15 text-brand-berry' },
  ready: { label: 'Ready now', className: 'bg-brand-berry/10 text-brand-berry' },
};

export const seasonStyle = (status: string) =>
  SEASON_STYLE[status] ?? { label: status, className: 'bg-brand-paper text-brand-muted' };

const VENDOR_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-status-ok/10 text-status-ok' },
  pending: { label: 'Pending', className: 'bg-status-warn/15 text-brand-berry' },
  suspended: { label: 'Suspended', className: 'bg-status-alert/10 text-status-alert' },
};

export const vendorStatusStyle = (status: string) =>
  VENDOR_STATUS[status] ?? { label: status, className: 'bg-brand-paper text-brand-muted' };

const EVENT_CATEGORY_EMOJI: Record<string, string> = {
  Gardening: '🌱',
  Kids: '🧒',
  Education: '📚',
  Food: '🍳',
  Music: '🎶',
  Health: '🩺',
  Community: '🤝',
  Art: '🎨',
};

export const eventCategoryEmoji = (category: string | null): string =>
  (category && EVENT_CATEGORY_EMOJI[category]) || '📣';

/** "in 12 days" / "today" / "8 days ago" from an ISO date, parsed locally (no TZ shift). */
export function relativeDays(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const n = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (n === 0) return 'today';
  return n > 0 ? `in ${n} day${n === 1 ? '' : 's'}` : `${-n} day${n === -1 ? '' : 's'} ago`;
}

const DOC_STATUS: Record<string, { label: string; className: string }> = {
  valid: { label: 'Valid', className: 'bg-status-ok/10 text-status-ok' },
  expiring: { label: 'Expiring', className: 'bg-status-warn/15 text-brand-berry' },
  expired: { label: 'Expired', className: 'bg-status-alert/10 text-status-alert' },
  no_expiry: { label: 'No expiry', className: 'bg-brand-paper text-brand-muted' },
};

export const docStatusStyle = (status: string) =>
  DOC_STATUS[status] ?? { label: status, className: 'bg-brand-paper text-brand-muted' };

/** Currency-code → short label (mirrors token_currencies labels for the UI + CSV). */
export const CURRENCY_LABEL: Record<string, string> = {
  snap: 'SNAP / EBT',
  dufb: 'Double Up Food Bucks',
  wic_fmnp: 'WIC / FMNP',
  market_scrip: 'Market Scrip',
};
