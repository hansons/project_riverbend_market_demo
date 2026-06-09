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

const CATEGORY_EMOJI: Record<string, string> = {
  Produce: '🥬',
  Bakery: '🍞',
  Flowers: '💐',
  'Meat & Eggs': '🥩',
  'Cheese & Dairy': '🧀',
  Mushrooms: '🍄',
  'Orchard & Fruit': '🍎',
  'Prepared Foods': '🍛',
};

export const categoryEmoji = (category: string): string => CATEGORY_EMOJI[category] ?? '🧺';

const SEASON_STYLE: Record<string, { label: string; className: string }> = {
  peak: { label: 'At peak', className: 'bg-status-ok/10 text-status-ok' },
  coming: { label: 'Coming soon', className: 'bg-status-info/10 text-status-info' },
  ending: { label: 'Last call', className: 'bg-status-warn/15 text-brand-berry' },
};

export const seasonStyle = (status: string) =>
  SEASON_STYLE[status] ?? { label: status, className: 'bg-brand-paper text-brand-muted' };
