import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ExternalLink, Calendar, Zap, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-container';
import { Separator } from '@/components/ui/divider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type Citation,
  type CitingResponse,
  type Platform,
  PLATFORM_INFO,
} from './types';

interface SourceDetailModalProps {
  /** Citation to display */
  citation: Citation | null;
  /** Responses that cited this source */
  responses?: CitingResponse[];
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
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
    hour: 'numeric',
    minute: '2-digit',
  });
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
 * SourceDetailModal - Full source details in a dialog
 *
 * Features:
 * - Full URL display with copy button
 * - Full snippet
 * - All responses that cited this source
 * - Platform and date information
 * - Influence score
 */
export function SourceDetailModal({
  citation,
  responses = [],
  open,
  onClose,
  className,
}: SourceDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${citation.domain}&sz=32`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(citation.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={cn('max-w-2xl max-h-[80vh]', className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img
              src={faviconUrl}
              alt=""
              className="w-8 h-8 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg">
                {citation.domain}
              </DialogTitle>
              <DialogDescription className="truncate">
                {citation.url}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL with copy button */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex-1 truncate"
            >
              {citation.url}
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyUrl}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <Button variant="ghost" size="icon">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Zap className={cn('w-5 h-5', getInfluenceColor(citation.influenceScore))} />
              <div>
                <div className="text-lg font-semibold">{citation.influenceScore}</div>
                <div className="text-xs text-muted-foreground">Influence Score</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
              <div>
                <div className="text-lg font-semibold">{citation.responseCount}</div>
                <div className="text-xs text-muted-foreground">Responses</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">
                  {formatDate(citation.firstSeenAt)}
                </div>
                <div className="text-xs text-muted-foreground">First seen</div>
              </div>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <h4 className="text-sm font-medium mb-2">Cited by</h4>
            <div className="flex flex-wrap gap-2">
              {citation.platforms.map((platform) => {
                const info = PLATFORM_INFO[platform];
                return (
                  <Badge
                    key={platform}
                    variant="outline"
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
          </div>

          {/* Snippet */}
          {citation.snippet && (
            <div>
              <h4 className="text-sm font-medium mb-2">Snippet</h4>
              <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                {citation.snippet}
              </p>
            </div>
          )}

          <Separator />

          {/* Responses that cited this source */}
          <div>
            <h4 className="text-sm font-medium mb-3">
              Citing Responses ({responses.length})
            </h4>
            {responses.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3 pr-4"
                >
                  {responses.map((response) => {
                    const platformInfo = PLATFORM_INFO[response.platform];
                    return (
                      <motion.div
                        key={response.id}
                        variants={staggerItem}
                        className="p-3 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: platformInfo.color,
                              color: platformInfo.color,
                            }}
                          >
                            {platformInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(response.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">
                          Query: {response.query}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {response.snippet}
                        </p>
                        {response.position > 0 && (
                          <span className="text-xs text-muted-foreground mt-1 block">
                            Position: #{response.position}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No response details available
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
