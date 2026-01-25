import { workspaceFetch as fetch } from '@/lib/workspace-query';


import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  Search,
  Loader2,
  Check,
  AlertCircle,
  ChevronLeft,
  ArrowRight,
  Building2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/check-control';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { PlatformIcon, getPlatformInfo, PLATFORMS } from '@/components/ui/platform-icon';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

type WizardStep = 'domain' | 'identify' | 'prompts' | 'scan' | 'confirm';

interface CompanyInfo {
  name: string;
  description: string;
  categories: string[];
  logoUrl?: string;
  prompts?: Array<{ text: string; category: string }>;
}

interface DiscoveredPrompt {
  id: string;
  text: string;
  category: 'alternatives' | 'comparisons' | 'reviews' | 'use-cases';
}

interface PlatformScanResult {
  platformId: string;
  found: boolean;
  score: number;
  progress: number; // 0-100
}

interface WizardState {
  step: WizardStep;
  domain: string;
  domainValid: boolean;
  company: CompanyInfo | null;
  prompts: DiscoveredPrompt[];
  selectedPromptIds: Set<string>;
  scanResults: Map<string, PlatformScanResult>;
  finalScore: number;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// Mock SSE Streaming (replace with real API later)
// =============================================================================

/**
 * Validates domain via backend API (checks format, TLD, and DNS existence)
 */
async function validateDomain(domain: string): Promise<{ valid: boolean; normalized: string; error?: string }> {
  try {
    const response = await fetch('/api/competitors/validate-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) {
      // Handle HTTP errors
      const errorData = await response.json().catch(() => ({}));
      return {
        valid: false,
        normalized: domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim(),
        error: errorData.error || 'Failed to validate domain',
      };
    }

    return await response.json();
  } catch (error) {
    // Network error - fallback to basic validation
    console.error('Domain validation API error:', error);
    return {
      valid: false,
      normalized: domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim(),
      error: 'Could not connect to validation service. Please try again.',
    };
  }
}

/**
 * Identifies company via backend LLM call (Gemini with web search grounding)
 * Returns company info AND prompts in a single call
 * Also fetches logo from Logo.dev
 */
async function identifyCompany(domain: string): Promise<CompanyInfo | null> {
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();

  // Generate logo URL using Logo.dev (free public API)
  const logoUrl = `https://img.logo.dev/${normalized}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`;

  try {
    const response = await fetch('/api/competitors/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: normalized }),
    });

    if (!response.ok) {
      throw new Error('Failed to identify company');
    }

    const data = await response.json();

    // Handle categories
    let categories: string[] = [];
    if (Array.isArray(data.categories)) {
      categories = data.categories;
    } else if (data.category) {
      categories = [data.category];
    } else {
      categories = ['Technology'];
    }

    // Handle prompts from API (may be empty, frontend will use fallback)
    const prompts = Array.isArray(data.prompts) ? data.prompts : [];

    return {
      name: data.name,
      description: data.description,
      categories,
      logoUrl,
      prompts,
    };
  } catch (error) {
    console.error('Company identification API error:', error);
    // Fallback to basic identification (no prompts - will use fallback generator)
    const companyName = normalized.split('.')[0].charAt(0).toUpperCase() + normalized.split('.')[0].slice(1);
    return {
      name: companyName,
      description: `${companyName} is a technology company that provides digital solutions and services to help businesses optimize their operations, streamline workflows, and achieve better outcomes in their respective markets.`,
      categories: ['Technology'],
      logoUrl,
      prompts: [],
    };
  }
}

/**
 * Get prompts from company info (from API) or generate fallback
 * Yields progressively for nice UI animation
 */
async function* getPrompts(company: CompanyInfo): AsyncGenerator<DiscoveredPrompt> {
  // Use prompts from API if available, otherwise use fallback templates
  const prompts = (company.prompts && company.prompts.length > 0)
    ? company.prompts
    : generateFallbackPrompts(company.name);

  let id = 0;
  for (const prompt of prompts) {
    // Progressive display delay
    await new Promise(r => setTimeout(r, 150 + Math.random() * 100));
    yield {
      id: `prompt-${id++}`,
      text: prompt.text,
      category: prompt.category as DiscoveredPrompt['category'],
    };
  }
}

/**
 * Fallback prompt templates when API doesn't return prompts
 */
function generateFallbackPrompts(companyName: string): Array<{ text: string; category: string }> {
  const name = companyName.toLowerCase();
  return [
    { text: `best ${name} alternative`, category: 'alternatives' },
    { text: `${name} competitors`, category: 'alternatives' },
    { text: `companies like ${name}`, category: 'alternatives' },
    { text: `${name} vs competitor comparison`, category: 'comparisons' },
    { text: `${name} pros and cons`, category: 'comparisons' },
    { text: `${name} reviews`, category: 'reviews' },
    { text: `is ${name} good`, category: 'reviews' },
    { text: `${name} reviews 2024`, category: 'reviews' },
    { text: `how to use ${name}`, category: 'use-cases' },
    { text: `${name} for startups`, category: 'use-cases' },
    { text: `${name} pricing`, category: 'use-cases' },
    { text: `${name} tutorial`, category: 'use-cases' },
  ];
}

/**
 * All platforms we track — derived from single source of truth (PLATFORMS)
 */
const ALL_PLATFORM_IDS = PLATFORMS.map(p => p.id);

/**
 * Simulates visibility scan across platforms
 * Mock data: well-known companies found on most platforms (80%+ chance)
 */
async function* scanPlatforms(
  prompts: DiscoveredPrompt[],
  onProgress: (platformId: string, progress: number) => void
): AsyncGenerator<PlatformScanResult> {
  for (const platformId of ALL_PLATFORM_IDS) {
    // Simulate incremental progress
    for (let progress = 0; progress <= 100; progress += 25) {
      await new Promise(r => setTimeout(r, 100));
      onProgress(platformId, progress);
    }

    // Mock data: 85% chance of being found (realistic for known companies)
    const found = Math.random() > 0.15;
    const score = found ? Math.floor(45 + Math.random() * 45) : 0;

    yield {
      platformId,
      found,
      score,
      progress: 100,
    };
  }
}

// =============================================================================
// Step Components
// =============================================================================

interface StepProps {
  state: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel?: () => void;
  /** List of already tracked competitor domains */
  existingDomains?: string[];
}

/**
 * Step 1: Domain Input & Validation
 */
function DomainStep({ state, onUpdate, onNext, onCancel, existingDomains = [] }: StepProps) {
  const [inputValue, setInputValue] = useState(state.domain);

  const handleValidate = async () => {
    if (!inputValue.trim()) return;

    onUpdate({ isLoading: true, error: null });

    try {
      const result = await validateDomain(inputValue.trim());

      if (result.valid) {
        // Check if domain is already being tracked
        const normalizedExisting = existingDomains.map(d =>
          d.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
        );
        if (normalizedExisting.includes(result.normalized)) {
          onUpdate({
            error: 'Already tracking this competitor.',
            isLoading: false,
          });
          return;
        }

        onUpdate({
          domain: result.normalized,
          domainValid: true,
          isLoading: false
        });
        onNext();
      } else {
        onUpdate({
          error: 'Domain not found. Check spelling or try another.',
          isLoading: false,
        });
      }
    } catch {
      onUpdate({
        error: 'Failed to validate domain. Please try again.',
        isLoading: false,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !state.isLoading) {
      handleValidate();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-figma-xs font-medium text-figma-secondary mb-2 block">
          Enter competitor domain
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-figma-muted" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="company.com"
            className="pl-10"
            autoFocus
            disabled={state.isLoading}
          />
          {state.isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-figma-muted animate-spin" />
          )}
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-figma-red shrink-0 mt-0.5" />
          <p className="text-figma-sm text-figma-red">{state.error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={state.isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleValidate}
          disabled={!inputValue.trim() || state.isLoading}
          className="flex-1"
        >
          {state.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

const IDENTIFY_LOADING_MESSAGES = [
  'Identifying company...',
  'Analyzing website...',
  'Extracting details...',
  'Almost done...',
];

/**
 * Step 2: Company Identification
 */
function IdentifyStep({ state, onUpdate, onNext, onBack, onCancel }: StepProps) {
  const hasRun = useRef(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  // Rotate loading messages
  useEffect(() => {
    if (!state.isLoading) return;

    const interval = setInterval(() => {
      setLoadingMsgIndex(prev => (prev + 1) % IDENTIFY_LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [state.isLoading]);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const identify = async () => {
      onUpdate({ isLoading: true, error: null });

      try {
        const company = await identifyCompany(state.domain);

        if (company) {
          onUpdate({ company, isLoading: false });
        } else {
          onUpdate({
            error: "Couldn't identify company. Try a different domain.",
            isLoading: false,
          });
        }
      } catch {
        onUpdate({
          error: 'Failed to identify company. Please try again.',
          isLoading: false,
        });
      }
    };

    identify();
  }, [state.domain, onUpdate]);

  if (state.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="relative">
          <Building2 className="w-12 h-12 text-figma-muted" />
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-figma-blue animate-pulse" />
        </div>
        <p className="text-figma-sm text-figma-secondary transition-opacity">
          {IDENTIFY_LOADING_MESSAGES[loadingMsgIndex]}
        </p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-figma-red shrink-0" />
          <p className="text-figma-sm text-figma-secondary">{state.error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ChevronLeft className="w-4 h-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!state.company) return null;

  return (
    <div className="space-y-4">
      <div className="bg-figma-hover rounded-lg p-4">
        {/* Logo and name header */}
        <div className="flex items-start gap-3 mb-3">
          {state.company.logoUrl ? (
            <img
              src={state.company.logoUrl}
              alt={`${state.company.name} logo`}
              className="w-12 h-12 rounded-lg object-contain bg-white border border-figma-border-light"
              onError={(e) => {
                // Hide broken image and show fallback
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-12 h-12 rounded-lg bg-figma-blue/10 flex items-center justify-center shrink-0 ${state.company.logoUrl ? 'hidden' : ''}`}>
            <Building2 className="w-6 h-6 text-figma-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-figma-green shrink-0" />
              <span className="text-figma-sm font-semibold text-figma-primary truncate">
                {state.company.name}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {state.company.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded bg-figma-hover text-figma-secondary text-figma-2xs font-medium border border-figma-border-light"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* Description */}
        <p className="text-figma-sm text-figma-secondary leading-relaxed">
          "{state.company.description}"
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Step 3: Prompts Discovery & Selection
 */
function PromptsStep({ state, onUpdate, onNext, onBack, onCancel }: StepProps) {
  const hasRun = useRef(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    if (hasRun.current || !state.company) return;
    hasRun.current = true;

    const discover = async () => {
      setIsDiscovering(true);
      const discoveredPrompts: DiscoveredPrompt[] = [];
      const selectedIds = new Set<string>();

      try {
        for await (const prompt of getPrompts(state.company!)) {
          discoveredPrompts.push(prompt);
          selectedIds.add(prompt.id); // All selected by default
          onUpdate({
            prompts: [...discoveredPrompts],
            selectedPromptIds: new Set(selectedIds),
          });
        }
      } catch {
        onUpdate({ error: 'Failed to discover prompts.' });
      }

      setIsDiscovering(false);
    };

    discover();
  }, [state.company, onUpdate]);

  const togglePrompt = (promptId: string) => {
    const newSelected = new Set(state.selectedPromptIds);
    if (newSelected.has(promptId)) {
      newSelected.delete(promptId);
    } else {
      newSelected.add(promptId);
    }
    onUpdate({ selectedPromptIds: newSelected });
  };

  const selectAll = () => {
    const allIds = new Set(state.prompts.map(p => p.id));
    onUpdate({ selectedPromptIds: allIds });
  };

  const selectNone = () => {
    onUpdate({ selectedPromptIds: new Set() });
  };

  const selectedCount = state.selectedPromptIds.size;
  const totalCount = state.prompts.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-figma-xs font-medium text-figma-secondary">
          Select prompts to track
        </p>
        {!isDiscovering && totalCount > 0 && (
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-figma-xs text-figma-blue hover:underline"
            >
              All
            </button>
            <span className="text-figma-tertiary">|</span>
            <button
              onClick={selectNone}
              className="text-figma-xs text-figma-blue hover:underline"
            >
              None
            </button>
          </div>
        )}
      </div>

      <TooltipProvider delayDuration={300}>
        <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
          {state.prompts.map((prompt) => (
            <label
              key={prompt.id}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors',
                state.selectedPromptIds.has(prompt.id)
                  ? 'bg-figma-blue-light'
                  : 'hover:bg-figma-hover'
              )}
            >
              <Checkbox
                checked={state.selectedPromptIds.has(prompt.id)}
                onCheckedChange={() => togglePrompt(prompt.id)}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-figma-sm text-figma-primary flex-1 line-clamp-2 cursor-default">
                    "{prompt.text}"
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[300px]">
                  <p className="text-figma-xs">"{prompt.text}"</p>
                </TooltipContent>
              </Tooltip>
            </label>
          ))}

          {isDiscovering && (
            <div className="flex items-center gap-2 p-2.5 text-figma-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-figma-xs">Discovering prompts...</span>
            </div>
          )}
        </div>
      </TooltipProvider>

      <div className="pt-2 border-t border-figma-border-light space-y-3">
        <span className="text-figma-xs text-figma-muted block">
          {selectedCount} of {totalCount} selected
        </span>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onNext}
            disabled={selectedCount === 0 || isDiscovering}
            className="flex-1"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 4: Platform Visibility Scan
 */
function ScanStep({ state, onUpdate, onNext, onBack, onCancel }: StepProps) {
  const hasRun = useRef(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const scan = async () => {
      setIsScanning(true);
      const results = new Map<string, PlatformScanResult>();

      // Initialize all 8 platforms
      ALL_PLATFORM_IDS.forEach(id => {
        results.set(id, { platformId: id, found: false, score: 0, progress: 0 });
      });
      onUpdate({ scanResults: new Map(results) });

      try {
        const selectedPrompts = state.prompts.filter(p => state.selectedPromptIds.has(p.id));

        for await (const result of scanPlatforms(
          selectedPrompts,
          (platformId, progress) => {
            const current = results.get(platformId);
            if (current) {
              results.set(platformId, { ...current, progress });
              onUpdate({ scanResults: new Map(results) });
            }
          }
        )) {
          results.set(result.platformId, result);
          onUpdate({ scanResults: new Map(results) });
        }

        // Calculate final score
        const scores = Array.from(results.values()).map(r => r.score);
        const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        onUpdate({ finalScore: avgScore });

      } catch {
        onUpdate({ error: 'Scan failed. Please try again.' });
      }

      setIsScanning(false);
    };

    scan();
  }, [state.prompts, state.selectedPromptIds, onUpdate]);

  const platformsFound = Array.from(state.scanResults.values()).filter(r => r.found).length;
  const totalPlatforms = state.scanResults.size;
  const allDone = !isScanning && totalPlatforms > 0;

  return (
    <div className="space-y-4">
      {isScanning && (
        <p className="text-figma-xs font-medium text-figma-secondary">
          Scanning AI platforms...
        </p>
      )}

      <div className="space-y-3">
        {Array.from(state.scanResults.entries()).map(([platformId, result]) => {
          const platform = getPlatformInfo(platformId);
          return (
            <div key={platformId} className="flex items-center gap-3">
              <PlatformIcon platform={platformId} size="sm" />
              <span className="text-figma-sm font-medium text-figma-primary w-24">
                {platform.name}
              </span>
              <div className="flex-1 h-2 bg-figma-bar-track rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${result.progress}%`,
                    backgroundColor: result.progress === 100
                      ? (result.found ? '#17A34A' : '#9CA3B0')
                      : '#2462EB',
                  }}
                />
              </div>
              <div className="w-6 flex justify-end">
                {result.progress === 100 ? (
                  result.found ? (
                    <div className="w-5 h-5 rounded-md border border-figma-green bg-green-50 flex items-center justify-center">
                      <Check className="w-3 h-3 text-figma-green" />
                    </div>
                  ) : (
                    <span className="text-figma-muted">—</span>
                  )
                ) : (
                  <Loader2 className="w-4 h-4 text-figma-blue animate-spin" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <>
          <div className="h-px bg-figma-border-light my-4" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-figma-lg font-bold text-figma-primary tabular-nums">
                {state.finalScore}
              </p>
              <p className="text-figma-2xs text-figma-muted">
                Visibility score
              </p>
            </div>
            <div>
              <p className="text-figma-lg font-bold text-figma-primary tabular-nums">
                {platformsFound}/{totalPlatforms}
              </p>
              <p className="text-figma-2xs text-figma-muted">
                Platforms
              </p>
            </div>
            <div>
              <p className="text-figma-lg font-bold text-figma-primary tabular-nums">
                {state.selectedPromptIds.size}
              </p>
              <p className="text-figma-2xs text-figma-muted">
                Prompts
              </p>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isScanning} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={onNext}
          disabled={isScanning}
          className="flex-1"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Step 5: Confirm & Add
 */
function ConfirmStep({ state, onUpdate, onBack, onClose }: StepProps & { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const platformsFound = Array.from(state.scanResults.values()).filter(r => r.found).length;

  const handleAdd = async () => {
    if (!state.company) return;

    setIsAdding(true);

    try {
      // Get selected prompt texts
      const selectedPromptTexts = state.prompts
        .filter(p => state.selectedPromptIds.has(p.id))
        .map(p => p.text);

      const response = await fetch('/api/competitors/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: state.domain,
          name: state.company.name,
          category: state.company.categories[0] || 'Technology', // Primary category for DB
          promptIds: Array.from(state.selectedPromptIds),
          initialScore: state.finalScore,
          platformsFound: Array.from(state.scanResults.entries())
            .filter(([_, r]) => r.found)
            .map(([id]) => id),
          discoveredPrompts: selectedPromptTexts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add competitor');
      }

      // Invalidate competitors queries to refresh the table
      queryClient.invalidateQueries({ queryKey: ['competitors'] });

      toast({
        title: `${state.company.name} added to competitors`,
        description: `Tracking ${state.selectedPromptIds.size} prompts across ${platformsFound} platforms`,
      });

      onClose();
    } catch (err: any) {
      onUpdate({ error: err.message || 'Failed to add competitor. Please try again.' });
      setIsAdding(false);
    }
  };

  if (!state.company) return null;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="border border-figma-border rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-figma-hover flex items-center justify-center">
            <Building2 className="w-5 h-5 text-figma-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-figma-md font-semibold text-figma-primary">
              {state.company.name}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {state.company.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded-md bg-figma-hover text-figma-secondary text-[10px] font-medium border border-figma-border-light"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-figma-border-light" />

        <div className="flex items-center justify-between text-figma-sm">
          <span className="text-figma-secondary">Score</span>
          <span className="font-medium text-figma-primary tabular-nums">
            {state.finalScore}
          </span>
        </div>
        <div className="flex items-center justify-between text-figma-sm">
          <span className="text-figma-secondary">Platforms</span>
          <div className="flex items-center gap-1.5">
            {Array.from(state.scanResults.entries())
              .filter(([_, r]) => r.found)
              .map(([platformId]) => (
                <PlatformIcon key={platformId} platform={platformId} size="xs" />
              ))}
            <span className="text-figma-xs text-figma-muted ml-1">
              ({platformsFound})
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-figma-sm">
          <span className="text-figma-secondary">Prompts tracked</span>
          <span className="font-medium text-figma-primary tabular-nums">
            {state.selectedPromptIds.size}
          </span>
        </div>
      </div>

      <p className="text-figma-sm text-figma-secondary text-center">
        Add "{state.company.name}" to your competitors?
        <br />
        <span className="text-figma-xs text-figma-muted">
          We'll track their visibility daily and show how you compare.
        </span>
      </p>

      {state.error && (
        <div className="bg-red-50 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-figma-red shrink-0 mt-0.5" />
          <p className="text-figma-sm text-figma-red">{state.error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} disabled={isAdding} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleAdd} disabled={isAdding} className="flex-1">
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add competitor'
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Rate Limit Reached View
 */
function RateLimitView({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4 text-center py-4">
      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
        <RefreshCw className="w-6 h-6 text-figma-orange" />
      </div>
      <div>
        <p className="text-figma-md font-semibold text-figma-primary mb-1">
          Daily limit reached
        </p>
        <p className="text-figma-sm text-figma-secondary">
          You've added 5 competitors today.<br />
          Come back tomorrow to add more.
        </p>
      </div>
      <p className="text-figma-xs text-figma-muted">
        Resets at midnight UTC.
      </p>
      <Button onClick={onClose} className="w-full">
        Got it
      </Button>
    </div>
  );
}

// =============================================================================
// Progress Indicator
// =============================================================================

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'domain', label: 'Domain' },
  { key: 'identify', label: 'Identify' },
  { key: 'prompts', label: 'Prompts' },
  { key: 'scan', label: 'Scan' },
  { key: 'confirm', label: 'Confirm' },
];

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                isCompleted ? 'bg-figma-green' :
                isCurrent ? 'bg-figma-blue' :
                'bg-figma-border'
              )}
              title={step.label}
            />
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-6 h-0.5 mx-0.5',
                  isCompleted ? 'bg-figma-green' : 'bg-figma-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** For testing rate limit UI */
  rateLimitReached?: boolean;
  /** List of already tracked competitor domains to prevent duplicates */
  existingDomains?: string[];
}

const INITIAL_STATE: WizardState = {
  step: 'domain',
  domain: '',
  domainValid: false,
  company: null,
  prompts: [],
  selectedPromptIds: new Set(),
  scanResults: new Map(),
  finalScore: 0,
  isLoading: false,
  error: null,
};

export function AddCompetitorModal({
  isOpen,
  onClose,
  rateLimitReached = false,
  existingDomains = [],
}: AddCompetitorModalProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setState(INITIAL_STATE);
    }
  }, [isOpen]);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, step, error: null }));
  }, []);

  const handleNext = useCallback(() => {
    const stepOrder: WizardStep[] = ['domain', 'identify', 'prompts', 'scan', 'confirm'];
    const currentIndex = stepOrder.indexOf(state.step);
    if (currentIndex < stepOrder.length - 1) {
      goToStep(stepOrder[currentIndex + 1]);
    }
  }, [state.step, goToStep]);

  const handleBack = useCallback(() => {
    const stepOrder: WizardStep[] = ['domain', 'identify', 'prompts', 'scan', 'confirm'];
    const currentIndex = stepOrder.indexOf(state.step);
    if (currentIndex > 0) {
      goToStep(stepOrder[currentIndex - 1]);
    }
  }, [state.step, goToStep]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const stepProps: StepProps = {
    state,
    onUpdate: updateState,
    onNext: handleNext,
    onBack: handleBack,
    existingDomains,
  };

  const getStepTitle = () => {
    switch (state.step) {
      case 'domain': return 'Add competitor';
      case 'identify': return 'Identifying company';
      case 'prompts': return 'Select prompts';
      case 'scan': return 'Visibility scan';
      case 'confirm': return 'Add competitor';
      default: return 'Add competitor';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="text-figma-md font-semibold text-figma-primary">
              {rateLimitReached ? 'Daily limit reached' : getStepTitle()}
            </h2>
            {!rateLimitReached && (
              <span className="text-figma-sm text-figma-muted tabular-nums">
                {STEPS.findIndex(s => s.key === state.step) + 1}/{STEPS.length}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            {rateLimitReached ? (
              <RateLimitView onClose={handleClose} />
            ) : (
              <>
                {state.step === 'domain' && <DomainStep {...stepProps} onCancel={handleClose} />}
                {state.step === 'identify' && <IdentifyStep {...stepProps} onCancel={handleClose} />}
                {state.step === 'prompts' && <PromptsStep {...stepProps} onCancel={handleClose} />}
                {state.step === 'scan' && <ScanStep {...stepProps} onCancel={handleClose} />}
                {state.step === 'confirm' && <ConfirmStep {...stepProps} onClose={handleClose} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AddCompetitorModal;
