import type { TimeRange } from '@/components/charts/time-range-selector';

export function timeRangeQuery(range?: TimeRange): string {
  if (!range || (range.preset !== 'custom' && range.preset !== 'all')) return '';
  const params = new URLSearchParams({
    startDate: range.from.toISOString(),
    endDate: range.to.toISOString(),
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });
  return `&${params.toString()}`;
}

export function timeRangeParams(range?: TimeRange): URLSearchParams {
  const params = new URLSearchParams();
  if (!range || (range.preset !== 'custom' && range.preset !== 'all')) return params;
  params.set('startDate', range.from.toISOString());
  params.set('endDate', range.to.toISOString());
  params.set('from', range.from.toISOString());
  params.set('to', range.to.toISOString());
  return params;
}
