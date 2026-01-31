import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Search, SortAsc, SortDesc, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/expandable-section';
import { TableSkeleton } from '@/components/shared/skeleton-loader';
import { EmptyState } from '@/components/shared/empty-state';
import { CitationCard, CompactCitationCard } from './CitationCard';
import { type Citation, type CitationGroup } from './types';

interface CitationListProps {
  /** Citation data (if not provided, fetches from API) */
  citations?: Citation[];
  /** Brand ID for fetching citations */
  brandId?: number;
  /** Callback when citation is selected */
  onSelectCitation?: (citation: Citation) => void;
  /** Show as compact list */
  compact?: boolean;
  /** Maximum items to show (before "show more") */
  maxItems?: number;
  /** Additional classes */
  className?: string;
}

type SortField = 'influence' | 'responses' | 'domain';
type SortOrder = 'asc' | 'desc';

/**
 * Group citations by domain
 */
function groupByDomain(citations: Citation[]): CitationGroup[] {
  const groups = new Map<string, CitationGroup>();

  for (const citation of citations) {
    const existing = groups.get(citation.domain);
    if (existing) {
      existing.citations.push(citation);
      existing.totalInfluence = Math.max(existing.totalInfluence, citation.influenceScore);
      existing.totalResponses += citation.responseCount;
    } else {
      groups.set(citation.domain, {
        domain: citation.domain,
        citations: [citation],
        totalInfluence: citation.influenceScore,
        totalResponses: citation.responseCount,
      });
    }
  }

  return Array.from(groups.values());
}

/**
 * CitationList - Display citations grouped by domain
 *
 * Features:
 * - Fetch from API or use passed data
 * - Group by domain
 * - Sort by influence score, response count, or domain
 * - Search/filter by domain
 * - Expandable groups
 * - Loading and empty states
 */
export function CitationList({
  citations: passedCitations,
  brandId,
  onSelectCitation,
  compact = false,
  maxItems,
  className,
}: CitationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('influence');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // Fetch citations if not provided
  const { data: fetchedCitations, isLoading, error } = useQuery<Citation[]>({
    queryKey: ['/api/analytics/citations', brandId],
    enabled: !passedCitations && !!brandId,
  });

  const citations = passedCitations || fetchedCitations || [];

  // Filter by search query
  const filteredCitations = useMemo(() => {
    if (!searchQuery.trim()) return citations;
    const query = searchQuery.toLowerCase();
    return citations.filter(
      (c) =>
        c.domain.toLowerCase().includes(query) ||
        c.url.toLowerCase().includes(query)
    );
  }, [citations, searchQuery]);

  // Group and sort
  const sortedGroups = useMemo(() => {
    const groups = groupByDomain(filteredCitations);

    groups.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'influence':
          comparison = a.totalInfluence - b.totalInfluence;
          break;
        case 'responses':
          comparison = a.totalResponses - b.totalResponses;
          break;
        case 'domain':
          comparison = a.domain.localeCompare(b.domain);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return groups;
  }, [filteredCitations, sortField, sortOrder]);

  // Apply max items limit
  const displayedGroups = maxItems && !showAll
    ? sortedGroups.slice(0, maxItems)
    : sortedGroups;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleDomain = (domain: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedDomains(newExpanded);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Cited Sources</CardTitle>
          <CardDescription>Sources referenced by AI platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={4} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Cited Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Failed to load citations"
            description="There was an error loading citation data. Please try again."
            primaryAction={{
              label: 'Retry',
              onClick: () => window.location.reload(),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (citations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Cited Sources</CardTitle>
          <CardDescription>Sources referenced by AI platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Globe}
            title="No citations found"
            description="No sources have been cited by AI platforms yet. Run more analyses to discover citations."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cited Sources</CardTitle>
            <CardDescription>
              {citations.length} source{citations.length !== 1 ? 's' : ''} from{' '}
              {sortedGroups.length} domain{sortedGroups.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex items-center gap-2 pt-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={sortField === 'influence' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => toggleSort('influence')}
            >
              Influence
              {sortField === 'influence' && (
                sortOrder === 'desc' ? (
                  <SortDesc className="w-3 h-3 ml-1" />
                ) : (
                  <SortAsc className="w-3 h-3 ml-1" />
                )
              )}
            </Button>
            <Button
              variant={sortField === 'responses' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => toggleSort('responses')}
            >
              Responses
              {sortField === 'responses' && (
                sortOrder === 'desc' ? (
                  <SortDesc className="w-3 h-3 ml-1" />
                ) : (
                  <SortAsc className="w-3 h-3 ml-1" />
                )
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {displayedGroups.map((group) => {
            const isExpanded = expandedDomains.has(group.domain);
            const hasMultiple = group.citations.length > 1;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${group.domain}&sz=24`;

            return (
              <motion.div key={group.domain} variants={staggerItem}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => hasMultiple && toggleDomain(group.domain)}
                >
                  <CollapsibleTrigger asChild disabled={!hasMultiple}>
                    <div
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors',
                        hasMultiple && 'cursor-pointer'
                      )}
                    >
                      {hasMultiple && (
                        isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )
                      )}
                      <img
                        src={faviconUrl}
                        alt=""
                        className="w-5 h-5 rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="font-medium text-foreground flex-1">
                        {group.domain}
                      </span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{group.citations.length} URL{group.citations.length !== 1 ? 's' : ''}</span>
                        <span>{group.totalResponses} responses</span>
                        <span className="font-medium text-foreground">
                          {group.totalInfluence}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="pl-8 pt-2 space-y-2">
                      {group.citations.map((citation) =>
                        compact ? (
                          <CompactCitationCard
                            key={citation.id}
                            url={citation.url}
                            platforms={citation.platforms}
                            influenceScore={citation.influenceScore}
                            responseCount={citation.responseCount}
                            onClick={() => onSelectCitation?.(citation)}
                          />
                        ) : (
                          <CitationCard
                            key={citation.id}
                            url={citation.url}
                            snippet={citation.snippet}
                            platforms={citation.platforms}
                            influenceScore={citation.influenceScore}
                            responseCount={citation.responseCount}
                            onClick={() => onSelectCitation?.(citation)}
                          />
                        )
                      )}
                    </div>
                  </CollapsibleContent>

                  {/* Show single citation inline if not expandable */}
                  {!hasMultiple && (
                    <div className="pl-8 pt-2">
                      {compact ? (
                        <CompactCitationCard
                          url={group.citations[0].url}
                          platforms={group.citations[0].platforms}
                          influenceScore={group.citations[0].influenceScore}
                          responseCount={group.citations[0].responseCount}
                          onClick={() => onSelectCitation?.(group.citations[0])}
                        />
                      ) : (
                        <CitationCard
                          url={group.citations[0].url}
                          snippet={group.citations[0].snippet}
                          platforms={group.citations[0].platforms}
                          influenceScore={group.citations[0].influenceScore}
                          responseCount={group.citations[0].responseCount}
                          onClick={() => onSelectCitation?.(group.citations[0])}
                        />
                      )}
                    </div>
                  )}
                </Collapsible>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Show more button */}
        {maxItems && sortedGroups.length > maxItems && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? 'Show less'
                : `Show ${sortedGroups.length - maxItems} more`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
