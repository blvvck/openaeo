import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  type SentimentKeyword,
  type Platform,
  PLATFORM_INFO,
  getSentimentTextClass,
  getSentimentBgClass,
} from './types';

interface QuoteCardProps {
  /** The quote/response text */
  text: string;
  /** Keywords with their sentiment scores */
  keywords: SentimentKeyword[];
  /** Platform the quote is from */
  platform: Platform;
  /** Date of the quote */
  date: string;
  /** Overall sentiment score */
  overallScore?: number;
  /** Click handler */
  onClick?: () => void;
  /** Additional classes */
  className?: string;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Highlight keywords in text with sentiment colors
 */
function highlightKeywords(
  text: string,
  keywords: SentimentKeyword[]
): React.ReactNode[] {
  if (!keywords.length) return [text];

  // Sort keywords by length (longest first) to avoid partial matches
  const sortedKeywords = [...keywords].sort(
    (a, b) => b.keyword.length - a.keyword.length
  );

  // Build regex pattern for all keywords
  const pattern = sortedKeywords
    .map((k) => k.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');

  // Split text and create highlighted spans
  const parts = text.split(regex);
  const keywordMap = new Map(
    keywords.map((k) => [k.keyword.toLowerCase(), k.score])
  );

  return parts.map((part, index) => {
    const score = keywordMap.get(part.toLowerCase());
    if (score !== undefined) {
      return (
        <span
          key={index}
          className={cn(
            'px-0.5 rounded font-medium',
            getSentimentBgClass(score),
            getSentimentTextClass(score)
          )}
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * QuoteCard - AI response excerpt with highlighted sentiment keywords
 *
 * Features:
 * - Display quote text with inline sentiment highlighting
 * - Color-coded keywords (positive = green, negative = red, neutral = gray)
 * - Platform badge
 * - Date display
 * - Overall sentiment indicator
 */
export function QuoteCard({
  text,
  keywords,
  platform,
  date,
  overallScore,
  onClick,
  className,
}: QuoteCardProps) {
  const platformInfo = PLATFORM_INFO[platform];

  const highlightedText = useMemo(
    () => highlightKeywords(text, keywords),
    [text, keywords]
  );

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      whileHover={onClick ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'transition-shadow',
          onClick && 'cursor-pointer hover:shadow-md',
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                style={{
                  borderColor: platformInfo.color,
                  color: platformInfo.color,
                }}
              >
                {platformInfo.label}
              </Badge>
              {overallScore !== undefined && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    getSentimentTextClass(overallScore)
                  )}
                >
                  {overallScore > 0 ? '+' : ''}
                  {(overallScore * 100).toFixed(0)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {formatDate(date)}
            </div>
          </div>

          {/* Quote text with highlighted keywords */}
          <div className="flex gap-2">
            <MessageSquare className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">
              {highlightedText}
            </p>
          </div>

          {/* Keywords summary */}
          {keywords.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-1.5">
                {keywords.slice(0, 5).map((kw, index) => (
                  <span
                    key={`${kw.keyword}-${index}`}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      getSentimentBgClass(kw.score),
                      getSentimentTextClass(kw.score)
                    )}
                  >
                    {kw.keyword}
                  </span>
                ))}
                {keywords.length > 5 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{keywords.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Compact quote display for list views
 */
export function CompactQuoteCard({
  text,
  platform,
  date,
  overallScore,
  onClick,
  className,
}: Omit<QuoteCardProps, 'keywords'>) {
  const platformInfo = PLATFORM_INFO[platform];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground line-clamp-2">{text}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              borderColor: platformInfo.color,
              color: platformInfo.color,
            }}
          >
            {platformInfo.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(date)}
          </span>
          {overallScore !== undefined && (
            <span
              className={cn(
                'text-xs font-medium',
                getSentimentTextClass(overallScore)
              )}
            >
              {overallScore > 0 ? '+' : ''}
              {(overallScore * 100).toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
