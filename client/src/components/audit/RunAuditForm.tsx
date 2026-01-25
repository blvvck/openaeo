import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/field-label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface RunAuditFormProps {
  /** Callback when form is submitted */
  onSubmit: (url: string) => void | Promise<void>;
  /** Whether the form is in loading state */
  isLoading?: boolean;
  /** Default URL value */
  defaultUrl?: string;
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Compact mode (no card wrapper) */
  compact?: boolean;
  /** Additional classes */
  className?: string;
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalize URL (add https:// if missing)
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

/**
 * RunAuditForm - Form to run a new site audit
 *
 * Features:
 * - URL input with validation
 * - Auto-adds https:// if missing
 * - Loading state with spinner
 * - Error state for invalid URLs
 */
export function RunAuditForm({
  onSubmit,
  isLoading = false,
  defaultUrl = '',
  title = 'Run Site Audit',
  description = 'Check how well your site is optimized for AI discovery',
  compact = false,
  className,
}: RunAuditFormProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const normalizedUrl = normalizeUrl(url);

      if (!isValidUrl(normalizedUrl)) {
        setError('Please enter a valid URL');
        return;
      }

      try {
        await onSubmit(normalizedUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to run audit');
      }
    },
    [url, onSubmit]
  );

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError(null);
  }, [error]);

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="audit-url">Website URL</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="audit-url"
              type="text"
              placeholder="example.com"
              value={url}
              onChange={handleUrlChange}
              disabled={isLoading}
              className={cn(
                'pr-10',
                error && 'border-destructive focus-visible:ring-destructive',
              )}
              aria-invalid={!!error}
              aria-describedby={error ? 'audit-url-error' : undefined}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            type="submit"
            isLoading={isLoading}
            loadingText="Analyzing..."
            disabled={!url.trim()}
          >
            Run Audit
          </Button>
        </div>
        {error && (
          <p id="audit-url-error" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );

  if (compact) {
    return <div className={cn('', className)}>{formContent}</div>;
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}

/**
 * Inline audit form for toolbar/header use
 */
export function InlineAuditForm({
  onSubmit,
  isLoading = false,
  placeholder = 'Enter URL to audit...',
  className,
}: {
  onSubmit: (url: string) => void | Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [url, setUrl] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const normalizedUrl = normalizeUrl(url);
      if (isValidUrl(normalizedUrl)) {
        await onSubmit(normalizedUrl);
        setUrl('');
      }
    },
    [url, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-2', className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading}
        className="w-64"
      />
      <Button
        type="submit"
        size="sm"
        isLoading={isLoading}
        disabled={!url.trim()}
      >
        Audit
      </Button>
    </form>
  );
}
