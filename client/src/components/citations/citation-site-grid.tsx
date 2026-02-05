import type { CategorizedCitationSources } from '@shared/types';

const categories = [
  { key: 'owned', label: 'Own', color: '#22C55E' },
  { key: 'thirdParty', label: 'Third-party', color: '#3B82F6' },
  { key: 'social', label: 'Social', color: '#8B5CF6' },
] as const;

export function CitationSiteGrid({ sources }: { sources: CategorizedCitationSources }) {
  const sites = categories.flatMap(category =>
    sources[category.key].sites.map(site => ({ ...category, site }))
  ).slice(0, 6);

  if (!sites.length) {
    return <p className="text-figma-2xs text-figma-muted">No sources</p>;
  }

  const rows = Math.ceil(sites.length / 2);

  return (
    <div
      className="grid grid-flow-col gap-x-3 gap-y-1"
      style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: `repeat(${rows}, minmax(0, auto))` }}
    >
      {sites.map(({ label, color, site }) => (
        <div key={`${label}-${site}`} className="flex min-w-0 items-center gap-1" title={`${label}: ${site}`}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-figma-2xs text-figma-muted">{site}</span>
        </div>
      ))}
    </div>
  );
}
