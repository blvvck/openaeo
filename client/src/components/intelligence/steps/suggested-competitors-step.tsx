/**
 * Suggested Competitors Step (Step 3)
 *
 * Show 5 LLM-suggested competitors. User can remove, add, reorder.
 */

import { useState, useEffect, useRef } from 'react';
import { Building2, GripVertical, X, Plus, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDomainValidation } from '@/hooks/use-domain-validation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/shared';
import type { SuggestedCompetitor, BrandProfile } from '../types';

interface SuggestedCompetitorsStepProps {
  brand: BrandProfile;
  competitors: SuggestedCompetitor[];
  isLoading: boolean;
  warning?: string | null; // Warning when using fallback data
  onBack: () => void;
  onContinue: (competitors: SuggestedCompetitor[]) => void;
  onAddCompetitor: (domain: string) => void;
  onRemoveCompetitor: (id: string) => void;
}

// Typewriter effect for streaming text
function TypewriterText({
  text,
  isComplete,
  typingSpeed = 20,
}: {
  text: string;
  isComplete: boolean;
  typingSpeed?: number;
}) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (isComplete) {
      setDisplayText(text);
      setIsTyping(false);
      return;
    }

    let index = 0;
    setDisplayText('');
    setIsTyping(true);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [text, isComplete, typingSpeed]);

  return (
    <span>
      {displayText}
      {isTyping && <span className="animate-pulse">|</span>}
    </span>
  );
}

// Competitor card component
function CompetitorCard({
  competitor,
  index,
  isStreaming,
  onRemove,
}: {
  competitor: SuggestedCompetitor;
  index: number;
  isStreaming: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        'border border-figma-border rounded-xl p-4 bg-figma-card',
        'transition-all duration-200'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle (disabled for now - drag-and-drop is follow-up) */}
        <div className="mt-0.5">
          <GripVertical className="w-4 h-4 text-figma-muted cursor-grab active:cursor-grabbing opacity-50" />
        </div>

        {/* Logo + name + domain */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-figma-hover flex items-center justify-center overflow-hidden shrink-0">
            {competitor.logo ? (
              <img
                src={competitor.logo}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Building2 className="w-5 h-5 text-figma-muted" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-figma-sm font-medium text-figma-primary truncate">
              {competitor.name}
            </h4>
            <span className="text-figma-2xs text-figma-muted">{competitor.domain}</span>
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="text-figma-muted hover:text-figma-red transition-colors p-1 shrink-0"
          aria-label={`Remove ${competitor.name}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Relevance reason with typewriter */}
      <p className="text-figma-xs text-figma-secondary mt-2 leading-relaxed pl-7">
        <TypewriterText
          text={competitor.reason}
          isComplete={!isStreaming}
          typingSpeed={15}
        />
      </p>
    </div>
  );
}

// Skeleton card for loading state
function CompetitorCardSkeleton() {
  return (
    <div className="border border-figma-border rounded-xl p-4 bg-figma-card">
      <div className="flex items-start gap-3">
        <Skeleton className="w-4 h-4 rounded mt-0.5" />
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 rounded mb-1" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        <Skeleton className="w-4 h-4 rounded" />
      </div>
      <div className="pl-7 mt-2 space-y-1">
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

export function SuggestedCompetitorsStep({
  brand,
  competitors,
  isLoading,
  warning,
  onBack,
  onContinue,
  onAddCompetitor,
  onRemoveCompetitor,
}: SuggestedCompetitorsStepProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompetitorUrl, setNewCompetitorUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [streamingIndex, setStreamingIndex] = useState(0);
  const { validate, isValidating } = useDomainValidation();

  // Simulate streaming effect - each card "streams in" one at a time
  useEffect(() => {
    if (isLoading) {
      setStreamingIndex(0);
      return;
    }

    // After loading completes, stream through each competitor
    if (competitors.length > 0 && streamingIndex < competitors.length) {
      const timer = setTimeout(() => {
        setStreamingIndex((prev) => prev + 1);
      }, 800); // Time between each card completing its typewriter
      return () => clearTimeout(timer);
    }
  }, [isLoading, competitors.length, streamingIndex]);

  // Clear validation error when URL changes
  useEffect(() => {
    setValidationError(null);
  }, [newCompetitorUrl]);

  const handleAddCompetitor = async () => {
    if (!newCompetitorUrl.trim()) return;

    // Validate domain exists before adding
    const result = await validate(newCompetitorUrl.trim());
    if (!result.valid) {
      setValidationError(result.error || 'Domain does not exist');
      return;
    }

    onAddCompetitor(result.domain || newCompetitorUrl.trim());
    setNewCompetitorUrl('');
    setValidationError(null);
    setShowAddModal(false);
  };

  const handleContinue = () => {
    onContinue(competitors);
  };

  const isValidUrl = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(
    newCompetitorUrl.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  );

  const canContinue = competitors.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-h2 font-semibold text-figma-primary">
            Suggested competitors
          </h2>
          <p className="text-figma-sm text-figma-secondary mt-1">
            Based on {brand.name}'s industry and positioning
          </p>
        </div>
        {!isLoading && competitors.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-figma-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add more
          </Button>
        )}
      </div>

      {/* Warning banner when using fallback data */}
      {warning && !isLoading && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-figma-xs text-amber-800 dark:text-amber-300">
            {warning}
          </p>
        </div>
      )}

      {/* Competitor cards */}
      <div className="space-y-3">
        {/* Show loaded competitors with streaming effect */}
        {competitors.map((competitor, index) => (
          <CompetitorCard
            key={competitor.id}
            competitor={competitor}
            index={index}
            isStreaming={index >= streamingIndex}
            onRemove={() => onRemoveCompetitor(competitor.id)}
          />
        ))}

        {/* Show skeleton cards during loading */}
        {isLoading && (
          <>
            {Array.from({ length: 5 - competitors.length }).map((_, i) => (
              <CompetitorCardSkeleton key={`skeleton-${i}`} />
            ))}
          </>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && competitors.length === 0 && (
        <div className="border border-figma-border rounded-xl p-8 bg-figma-card text-center">
          <p className="text-figma-sm text-figma-secondary mb-4">
            Add at least one competitor to continue
          </p>
          <Button
            variant="outline"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add competitor
          </Button>
        </div>
      )}

      {/* Button row */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-figma-border-light">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-figma-secondary"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          className="bg-figma-blue text-white hover:bg-blue-600"
          disabled={!canContinue || isLoading}
        >
          Continue
        </Button>
      </div>

      {/* Add Competitor Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open);
        if (!open) {
          setNewCompetitorUrl('');
          setValidationError(null);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-figma-md font-semibold text-figma-primary">
              Add competitor
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Input
              placeholder="competitor.com"
              className={cn(
                validationError && "border-figma-red focus-visible:ring-figma-red"
              )}
              value={newCompetitorUrl}
              onChange={(e) => setNewCompetitorUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValidUrl && !isValidating) {
                  handleAddCompetitor();
                }
              }}
              disabled={isValidating}
              autoFocus
            />
            {validationError && (
              <div className="flex items-center gap-1.5 mt-2 text-figma-red">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <p className="text-figma-xs">{validationError}</p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setShowAddModal(false)} disabled={isValidating}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCompetitor}
              disabled={!isValidUrl || isValidating}
              className="bg-figma-blue text-white hover:bg-blue-600"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Checking...
                </>
              ) : (
                'Add'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
