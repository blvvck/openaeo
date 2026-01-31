/**
 * Brand Profile Step (Step 2)
 *
 * Show auto-fetched brand info. User can edit before continuing.
 * Industry field uses multi-select badges from LLM suggestions.
 */

import { useState, useEffect } from 'react';
import { Building2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/multiline-field';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BrandProfile } from '../types';

interface BrandProfileStepProps {
  brand: BrandProfile | null;
  isLoading: boolean;
  loadingMessage: string;
  onBack: () => void;
  onContinue: (brand: BrandProfile) => void;
}

// How many badges to show before "+N more"
const VISIBLE_BADGES = 5;

// Loading skeleton that mirrors the actual form layout
function LoadingSkeleton({ message }: { message: string }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="border border-figma-border rounded-xl bg-figma-card p-8">
        {/* Title - same as real form */}
        <h2 className="text-h2 font-semibold text-figma-primary text-center">
          Confirm brand details
        </h2>
        <p className="text-figma-sm text-figma-secondary text-center mt-2">
          {message}
        </p>

        {/* Logo + Domain header skeleton */}
        <div className="flex items-center gap-4 mt-6 mb-6">
          <div className="w-12 h-12 rounded-lg bg-figma-hover animate-pulse shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-32 bg-figma-hover animate-pulse rounded" />
            <div className="h-3 w-24 bg-figma-hover animate-pulse rounded" />
          </div>
        </div>

        {/* Form fields skeleton */}
        <div className="space-y-4">
          {/* Brand name */}
          <div>
            <div className="h-3 w-20 bg-figma-hover animate-pulse rounded mb-2" />
            <div className="h-10 w-full bg-figma-hover animate-pulse rounded-md" />
          </div>

          {/* Description */}
          <div>
            <div className="h-3 w-20 bg-figma-hover animate-pulse rounded mb-2" />
            <div className="h-[120px] w-full bg-figma-hover animate-pulse rounded-md" />
          </div>

          {/* Industry badges */}
          <div>
            <div className="h-3 w-16 bg-figma-hover animate-pulse rounded mb-2" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-7 bg-figma-hover animate-pulse rounded-full"
                  style={{ width: `${60 + (i * 15)}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Button row skeleton */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-figma-border-light">
          <div className="h-9 w-16 bg-figma-hover animate-pulse rounded" />
          <div className="h-9 w-24 bg-figma-hover animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}

// Multi-select industry badges
function IndustryBadges({
  suggestions,
  selected,
  onToggle,
}: {
  suggestions: string[];
  selected: string[];
  onToggle: (industry: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleSuggestions = expanded
    ? suggestions
    : suggestions.slice(0, VISIBLE_BADGES);
  const hiddenCount = suggestions.length - VISIBLE_BADGES;
  const showExpandButton = hiddenCount > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleSuggestions.map((industry) => {
          const isSelected = selected.includes(industry);
          return (
            <Badge
              key={industry}
              variant={isSelected ? 'default' : 'outline'}
              size="lg"
              interactive
              onClick={() => onToggle(industry)}
              className={cn(
                'cursor-pointer transition-all',
                isSelected
                  ? 'bg-figma-blue text-white border-figma-blue hover:bg-blue-600'
                  : 'bg-transparent text-figma-secondary border-figma-border hover:border-figma-blue hover:text-figma-blue'
              )}
            >
              {industry}
            </Badge>
          );
        })}

        {/* +N more / Show less button */}
        {showExpandButton && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 px-3 py-1 text-figma-xs font-medium text-figma-blue hover:text-blue-600 transition-colors"
          >
            {expanded ? (
              <>
                Show less
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                +{hiddenCount} more
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>

    </div>
  );
}

export function BrandProfileStep({
  brand,
  isLoading,
  loadingMessage,
  onBack,
  onContinue,
}: BrandProfileStepProps) {
  // Local state for editing
  // Pre-select all suggested industries by default
  const [name, setName] = useState(brand?.name || '');
  const [description, setDescription] = useState(brand?.description || '');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(
    brand?.industries?.length ? brand.industries : (brand?.suggestedIndustries || [])
  );

  // Update local state when brand changes
  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setDescription(brand.description);
      // Pre-select all suggestions if no industries were explicitly set
      setSelectedIndustries(
        brand.industries?.length ? brand.industries : (brand.suggestedIndustries || [])
      );
    }
  }, [brand]);

  // Loading state - show skeleton that matches the form layout
  if (isLoading || !brand) {
    return <LoadingSkeleton message={loadingMessage || 'Analyzing website...'} />;
  }

  const handleToggleIndustry = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((i) => i !== industry)
        : [...prev, industry]
    );
  };

  const handleContinue = () => {
    onContinue({
      ...brand,
      name,
      description,
      industries: selectedIndustries,
    });
  };

  const isValid = name.trim() && description.trim() && selectedIndustries.length > 0;

  return (
    <div className="max-w-md mx-auto">
      <div className="border border-figma-border rounded-xl bg-figma-card p-8">
        {/* Title */}
        <h2 className="text-h2 font-semibold text-figma-primary text-center">
          Confirm brand details
        </h2>
        <p className="text-figma-sm text-figma-secondary text-center mt-2">
          Edit anything that looks off
        </p>

        {/* Warning banner when using fallback data */}
        {brand.warning && (
          <div className="flex items-start gap-2 mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-figma-xs text-amber-800 dark:text-amber-300">
              {brand.warning}
            </p>
          </div>
        )}

        {/* Logo + Domain header */}
        <div className="flex items-center gap-4 mt-6 mb-6">
          <div className="w-12 h-12 rounded-lg bg-figma-hover flex items-center justify-center overflow-hidden shrink-0">
            {brand.logo ? (
              <img
                src={brand.logo}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide broken images
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Building2 className="w-6 h-6 text-figma-muted" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-figma-md font-semibold text-figma-primary truncate">
              {name || brand.name}
            </h3>
            <span className="text-figma-xs text-figma-muted">{brand.domain}</span>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {/* Brand name */}
          <div>
            <label className="text-figma-xs font-medium text-figma-secondary block mb-2">
              Brand name
            </label>
            <Input
              type="text"
              className="text-figma-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-figma-xs font-medium text-figma-secondary block mb-2">
              Description
            </label>
            <Textarea
              className="min-h-[120px] text-figma-sm resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Industry - Multi-select badges */}
          <div>
            <label className="text-figma-xs font-medium text-figma-secondary block mb-2">
              Industry
            </label>
            <IndustryBadges
              suggestions={brand.suggestedIndustries || []}
              selected={selectedIndustries}
              onToggle={handleToggleIndustry}
            />
          </div>
        </div>

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
            disabled={!isValid}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
