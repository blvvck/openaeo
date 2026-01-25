/**
 * Centralized display formatters
 *
 * Single source of truth for all text formatting across dashboard cards.
 * Any card or page that needs to display a number, rank, or label imports from here.
 */

/** Format a large number with K/M suffix: 2400 → "2.4K", 150 → "150" */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Format a rank badge: (1, 5) → "#1 of 5" */
export function formatRankBadge(rank: number, total: number): string {
  return `#${rank} of ${total}`;
}

/** Format a trend value with sign: 12 → "+12%", -3.1 → "-3.1%" */
export function formatTrend(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

/** Format a percentage: 72 → "72%" */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
