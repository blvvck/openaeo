import { motion } from 'framer-motion';
import { ExternalLink, Globe, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type Citation, type Platform, PLATFORM_INFO } from './types';

interface CitationCardProps {
  /** Source URL */
  url: string;
  /** Snippet/excerpt from the source */
  snippet: string;
  /** Platforms that cited this source */
  platforms: Platform[];
  /** Influence score (0-100) */
  influenceScore: number;
  /** Number of responses citing this source */
  responseCount: number;
  /** Click handler */
  onClick?: () => void;
  /** Additional classes */
  className?: string;
}

/**
 * Get domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

/**
 * Get influence score color
 */
function getInfluenceColor(score: number): string {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-muted-foreground';
}

/**
 * Get influence score background
 */
function getInfluenceBg(score: number): string {
  if (score >= 70) return 'bg-success/10';
  if (score >= 40) return 'bg-warning/10';
  return 'bg-muted';
}

/**
 * CitationCard - Display a source citation with metadata
 *
 * Features:
 * - Domain favicon (using Google favicon API)
 * - Truncated URL with full URL on hover
 * - Snippet preview
 * - Platform badges showing which AIs cited this source
 * - Influence score indicator
 * - Response count
 */
export function CitationCard({
  url,
  snippet,
  platforms,
  influenceScore,
  responseCount,
  onClick,
  className,
}: CitationCardProps) {
  const domain = extractDomain(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        interactive
        className={cn(
          'cursor-pointer transition-shadow hover:shadow-md',
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Header: Favicon + URL + Influence */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src={faviconUrl}
                alt=""
                className="w-5 h-5 rounded flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-primary truncate flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {truncateUrl(url)}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-md break-all">
                    {url}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Influence Score */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      getInfluenceBg(influenceScore),
                      getInfluenceColor(influenceScore)
                    )}
                  >
                    <Zap className="w-3 h-3" />
                    <span>{influenceScore}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Influence Score: {influenceScore}/100
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Snippet */}
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {snippet || 'No snippet available'}
          </p>

          {/* Footer: Platforms + Response count */}
          <div className="flex items-center justify-between gap-2">
            {/* Platform badges */}
            <div className="flex items-center gap-1 flex-wrap">
              {platforms.map((platform) => {
                const info = PLATFORM_INFO[platform];
                return (
                  <Badge
                    key={platform}
                    variant="outline"
                    className="text-xs px-1.5 py-0.5"
                    style={{
                      borderColor: info.color,
                      color: info.color,
                    }}
                  >
                    {info.label}
                  </Badge>
                );
              })}
            </div>

            {/* Response count */}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {responseCount} {responseCount === 1 ? 'response' : 'responses'}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Compact citation card for list views
 */
export function CompactCitationCard({
  url,
  platforms,
  influenceScore,
  responseCount,
  onClick,
  className,
}: Omit<CitationCardProps, 'snippet'>) {
  const domain = extractDomain(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors',
        className
      )}
      onClick={onClick}
    >
      <img
        src={faviconUrl}
        alt=""
        className="w-4 h-4 rounded flex-shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className="text-sm text-foreground truncate flex-1">{domain}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{responseCount}</span>
        <div
          className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded',
            getInfluenceBg(influenceScore),
            getInfluenceColor(influenceScore)
          )}
        >
          {influenceScore}
        </div>
      </div>
    </div>
  );
}
