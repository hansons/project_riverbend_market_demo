import type { Vendor } from '@/lib/types';

/** Monotonic week counter (weeks since the epoch) — drives the weekly rotation. */
export function weekIndex(): number {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Up to `count` featured vendors for the current week, rotating through the pool
 * by one each week. With more than `count` starred, the spotlight changes weekly
 * on its own — no scheduling needed.
 */
export function pickWeeklyFeatured(pool: Vendor[], count = 3): Vendor[] {
  if (pool.length <= count) return pool;
  const offset = weekIndex() % pool.length;
  return Array.from({ length: count }, (_, i) => pool[(offset + i) % pool.length]);
}
