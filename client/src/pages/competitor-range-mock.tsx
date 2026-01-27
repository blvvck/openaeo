import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { ContentCard } from '@/components/shared/dashboard-card';
import { CardEmptyState } from '@/components/shared/empty-state';
import {
  CitationRateCompetitorCard,
  CompetitivePressureCard,
  HighIntentCard,
  ShareOfAnswerCard,
  YourRankCard,
} from '@/components/competitors/competitor-metrics';
import { TimeRangeSelector, useTimeRange } from '@/components/charts/time-range-selector';

export function CompetitorRangeMock() {
  const { range, setRange } = useTimeRange('30d');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash === '#rankings') {
      document.getElementById('rankings')?.scrollIntoView();
    }
  }, []);

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-h1 text-figma-primary">Competitors</h1>
            <p className="mt-1 text-figma-sm text-figma-secondary">See how you compare to the competition</p>
          </div>
          <TimeRangeSelector
            value={range}
            onChange={setRange}
            open={dateFilterOpen}
            onOpenChange={setDateFilterOpen}
          />
        </header>

        <section className="flex gap-6 overflow-x-auto pb-2 scrollbar-hover -mr-6 pr-6" aria-label="Summary metrics">
          <div className="w-[260px] shrink-0"><YourRankCard data={null} brandName="Test" noPeriodData /></div>
          <div className="w-[260px] shrink-0"><ShareOfAnswerCard data={null} brandName="Test" noPeriodData /></div>
          <div className="w-[260px] shrink-0"><HighIntentCard data={null} noPeriodData /></div>
          <div className="w-[260px] shrink-0"><CitationRateCompetitorCard data={null} noPeriodData /></div>
          <div className="w-[260px] shrink-0"><CompetitivePressureCard data={null} noPeriodData /></div>
        </section>

        <section id="rankings">
          <ContentCard
            title="Competitor rankings"
            subtitle="See where you rank in AI responses"
            actionLabel="+ Add competitor"
            onAction={() => undefined}
            hideActionIcon
            contentClassName="pt-0"
          >
          <div className="grid grid-cols-[2fr_5fr_4fr_4fr_5fr_4fr_3fr_3fr_2fr_1fr] gap-2 px-5 py-3 border-b border-figma-border-light">
            <span className="text-figma-2xs font-medium text-figma-secondary">Rank</span>
            <span className="text-figma-2xs font-medium text-figma-secondary">Brand</span>
            <span className="text-figma-2xs font-medium text-figma-secondary text-right">Share of answers</span>
            <span className="text-figma-2xs font-medium text-figma-secondary text-right">High-intent</span>
            <span className="text-figma-2xs font-medium text-figma-secondary pl-3">Top prompt</span>
            <span className="text-figma-2xs font-medium text-figma-secondary">Platforms</span>
            <span className="text-figma-2xs font-medium text-figma-secondary text-right">Score</span>
            <span className="text-figma-2xs font-medium text-figma-secondary text-right">Trend</span>
            <span className="text-figma-2xs font-medium text-figma-secondary text-right">Δ</span>
            <span></span>
          </div>
          <CardEmptyState
            icon={Search}
            title="No rankings for this period"
            description="Change the date range to view results from another period."
            action={{ label: 'Adjust date filter', onClick: () => setDateFilterOpen(true) }}
            className="min-h-[280px]"
          />
          </ContentCard>
        </section>
      </div>
    </main>
  );
}
