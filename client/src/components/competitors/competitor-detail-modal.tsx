

import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { CompanyAvatar } from '@/components/ui/company-avatar';
import type { CompetitorDetail } from '@shared/types';

interface CompetitorDetailModalProps {
  competitor: CompetitorDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CompetitorDetailModal({
  competitor,
  isOpen,
  onClose,
}: CompetitorDetailModalProps) {
  if (!competitor) return null;

  const hasDiscoveryData = competitor.initialScore != null ||
    (competitor.platformsFound && competitor.platformsFound.length > 0) ||
    (competitor.discoveredPrompts && competitor.discoveredPrompts.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CompanyAvatar name={competitor.name} domain={competitor.domain} size="sm" />
            <div>
              <span className="text-figma-md font-semibold text-figma-primary">
                {competitor.name}
              </span>
              {competitor.domain && (
                <p className="text-figma-2xs text-figma-muted">{competitor.domain}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Discovery Data Section */}
          {hasDiscoveryData ? (
            <>
              {/* Initial Visibility Score */}
              {competitor.initialScore != null && (
                <div className="flex items-center justify-between py-3 border-b border-figma-border-light">
                  <span className="text-figma-sm text-figma-secondary">Initial visibility score</span>
                  <span className="text-figma-lg font-bold text-figma-primary tabular-nums">
                    {competitor.initialScore}
                  </span>
                </div>
              )}

              {/* Platforms Found */}
              {competitor.platformsFound && competitor.platformsFound.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-figma-sm text-figma-secondary">Platforms found</span>
                    <span className="text-figma-xs text-figma-muted">
                      {competitor.platformsFound.length} of 8
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {competitor.platformsFound.map((platformId) => (
                      <div
                        key={platformId}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-figma-hover border border-figma-border-light"
                      >
                        <PlatformIcon platform={platformId} size="xs" />
                        <span className="text-figma-xs text-figma-primary capitalize">
                          {platformId.replace(/-/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discovered Prompts */}
              {competitor.discoveredPrompts && competitor.discoveredPrompts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-figma-border-light">
                  <div className="flex items-center justify-between">
                    <span className="text-figma-sm text-figma-secondary">Tracked prompts</span>
                    <span className="text-figma-xs text-figma-muted">
                      {competitor.discoveredPrompts.length}
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {competitor.discoveredPrompts.map((prompt, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1.5 rounded bg-figma-hover border border-figma-border-light"
                      >
                        <span className="text-figma-xs text-figma-primary line-clamp-1">
                          "{prompt}"
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No discovery data available */
            <div className="text-center py-8">
              <p className="text-figma-sm text-figma-muted">
                No discovery data available for this competitor.
              </p>
              <p className="text-figma-xs text-figma-muted mt-1">
                This competitor may have been added before the discovery feature was available.
              </p>
            </div>
          )}

          {/* Current Metrics (if tracked) */}
          {competitor.score > 0 && (
            <div className="pt-4 border-t border-figma-border-light">
              <p className="text-figma-2xs font-medium text-figma-secondary mb-3">
                Current Performance
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-figma-xs text-figma-muted">Visibility Score</p>
                  <p className="text-figma-md font-semibold text-figma-primary tabular-nums">
                    {competitor.score.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-figma-xs text-figma-muted">Trend</p>
                  <p className={`text-figma-md font-semibold tabular-nums ${
                    competitor.trend > 0 ? 'text-figma-trend-up' :
                    competitor.trend < 0 ? 'text-figma-trend-down' : 'text-figma-muted'
                  }`}>
                    {competitor.trend > 0 ? '+' : ''}{competitor.trend.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
