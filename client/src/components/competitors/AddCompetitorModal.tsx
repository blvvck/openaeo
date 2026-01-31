import { useState } from 'react';
import { Search, Plus, Globe, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/field-label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type CompetitorSuggestion } from './types';

interface AddCompetitorModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when competitor is added */
  onAdd: (name: string, domain: string) => void;
  /** Suggested competitors */
  suggestions?: CompetitorSuggestion[];
  /** Loading state for suggestions */
  suggestionsLoading?: boolean;
  /** Additional classes */
  className?: string;
}

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(domain);
}

/**
 * Clean domain input (remove protocol, www, trailing slashes)
 */
function cleanDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '');
  domain = domain.replace(/^www\./, '');
  domain = domain.replace(/\/.*$/, '');
  return domain;
}

/**
 * AddCompetitorModal - Dialog to add a competitor
 *
 * Features:
 * - Search input with suggestions
 * - Domain input with validation
 * - Suggested competitors list
 * - Confirm button
 */
export function AddCompetitorModal({
  open,
  onClose,
  onAdd,
  suggestions = [],
  suggestionsLoading = false,
  className,
}: AddCompetitorModalProps) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [domainError, setDomainError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDomainChange = (value: string) => {
    const cleaned = cleanDomain(value);
    setDomain(cleaned);
    if (cleaned && !isValidDomain(cleaned)) {
      setDomainError('Please enter a valid domain (e.g., example.com)');
    } else {
      setDomainError('');
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (!domain.trim() || !isValidDomain(domain)) return;

    onAdd(name.trim(), domain.trim());
    handleReset();
  };

  const handleSelectSuggestion = (suggestion: CompetitorSuggestion) => {
    setName(suggestion.name);
    setDomain(suggestion.domain);
    setDomainError('');
  };

  const handleReset = () => {
    setName('');
    setDomain('');
    setDomainError('');
    setSearchQuery('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canSubmit = name.trim() && domain.trim() && isValidDomain(domain);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle>Add Competitor</DialogTitle>
          <DialogDescription>
            Add a competitor to track and compare their AI visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label>Suggestions</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suggestions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="max-h-32 overflow-auto border rounded-md divide-y">
                {suggestionsLoading ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Loading suggestions...
                  </div>
                ) : filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.domain}
                      type="button"
                      className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{suggestion.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {suggestion.domain}
                          {suggestion.category && (
                            <span className="ml-2 text-primary">
                              {suggestion.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No suggestions found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual entry */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="competitor-name">Company Name</Label>
              <Input
                id="competitor-name"
                placeholder="e.g., Acme Inc."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitor-domain">Domain</Label>
              <div className="relative">
                <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="competitor-domain"
                  placeholder="e.g., acme.com"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  className={cn('pl-8', domainError && 'border-destructive')}
                />
                {domain && (
                  <button
                    type="button"
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setDomain('');
                      setDomainError('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {domainError && (
                <p className="text-xs text-destructive">{domainError}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <Plus className="w-4 h-4 mr-2" />
            Add Competitor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
