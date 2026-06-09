export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Current calendar month, 1–12 (drives "in season now" highlighting). */
export function currentMonth(): number {
  return new Date().getMonth() + 1;
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
