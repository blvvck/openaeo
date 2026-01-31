/**
 * Enter URL Step (Step 1)
 *
 * Capture the competitor domain to analyze.
 */

import { useState, useEffect } from 'react';
import { Globe, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDomainValidation } from '@/hooks/use-domain-validation';

interface RecentSearch {
  domain: string;
  date: string;
}

interface EnterUrlStepProps {
  initialUrl: string;
  recentSearches: RecentSearch[];
  isLoading: boolean;
  error: string | null;
  onSubmit: (url: string) => void;
}

function isValidDomain(url: string): boolean {
  // Simple domain validation - allows with or without protocol
  const domainPattern = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
  return domainPattern.test(url.trim());
}

function normalizeDomain(url: string): string {
  // Strip protocol and trailing slash for display
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function EnterUrlStep({
  initialUrl,
  recentSearches,
  isLoading,
  error,
  onSubmit,
}: EnterUrlStepProps) {
  const [url, setUrl] = useState(initialUrl);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { validate, isValidating } = useDomainValidation();
  const isValidFormat = isValidDomain(url);

  // Reset URL when initialUrl changes (coming back from later step)
  useEffect(() => {
    if (initialUrl && initialUrl !== url) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);

  // Clear validation error when URL changes
  useEffect(() => {
    setValidationError(null);
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidFormat || isLoading || isValidating) return;

    // Validate domain exists before proceeding
    const result = await validate(url);
    if (!result.valid) {
      setValidationError(result.error || 'Domain does not exist');
      return;
    }

    onSubmit(result.domain || normalizeDomain(url));
  };

  const handleRecentClick = (domain: string) => {
    setUrl(domain);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="border border-figma-border rounded-xl bg-figma-card p-8">
        {/* Title */}
        <h2 className="text-h2 font-semibold text-figma-primary text-center">
          Analyze a competitor
        </h2>
        <p className="text-figma-sm text-figma-secondary text-center mt-2">
          Enter a website URL to research their AI visibility
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8">
          <div>
            <label className="text-figma-xs font-medium text-figma-secondary block mb-2">
              Website URL
            </label>
            <Input
              type="text"
              placeholder="example.com"
              className={cn(
                "text-figma-sm",
                validationError && "border-figma-red focus-visible:ring-figma-red"
              )}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading || isValidating}
              autoFocus
            />
            {(error || validationError) && (
              <div className="flex items-center gap-1.5 mt-2 text-figma-red">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <p className="text-figma-xs">{validationError || error}</p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-6 bg-figma-blue text-white hover:bg-blue-600"
            disabled={!isValidFormat || isLoading || isValidating}
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking domain...
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching brand info...
              </>
            ) : (
              'Analyze'
            )}
          </Button>
        </form>

        {/* Recent Searches */}
        {recentSearches.length > 0 && !isLoading && (
          <div className="mt-8 pt-6 border-t border-figma-border-light">
            <h4 className="text-figma-2xs font-medium text-figma-secondary uppercase mb-3">
              Recent searches
            </h4>
            <div className="space-y-2">
              {recentSearches.slice(0, 5).map((search) => (
                <button
                  key={search.domain}
                  type="button"
                  onClick={() => handleRecentClick(search.domain)}
                  className="flex items-center gap-2 text-figma-sm text-figma-primary hover:text-figma-blue transition-colors w-full text-left"
                >
                  <Globe className="w-3.5 h-3.5 text-figma-muted shrink-0" />
                  <span className="truncate">{search.domain}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
