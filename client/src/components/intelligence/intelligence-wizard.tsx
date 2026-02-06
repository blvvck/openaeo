import { workspaceFetch as fetch } from '@/lib/workspace-query';
/**
 * Intelligence Wizard
 *
 * Main orchestrator for the Competitor Intelligence feature.
 * Manages state machine and step transitions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useActiveWorkspaceName } from '@/hooks/use-active-workspace';
import { useAddCompetitor } from '@/hooks/use-competitors';
import { useToast } from '@/hooks/use-toast';
import { companyLogoUrl } from '@/lib/logo-url';

import { ProgressBar } from './progress-bar';
import { EnterUrlStep } from './steps/enter-url-step';
import { BrandProfileStep } from './steps/brand-profile-step';
import { SuggestedCompetitorsStep } from './steps/suggested-competitors-step';
import { CustomerPromptsStep } from './steps/customer-prompts-step';
import { ResultsPage } from './results/results-page';

import type {
  WizardStep,
  WizardState,
  BrandProfile,
  SuggestedCompetitor,
  CustomerPrompt,
  ResearchResults,
} from './types';

import {
  LOADING_MESSAGES,
  MOCK_BRAND_PROFILE,
  MOCK_COMPETITORS,
  MOCK_PROMPTS,
} from './mock-data';

// API functions
async function fetchRecentSearches(): Promise<{ domain: string; date: string }[]> {
  const res = await fetch('/api/intelligence/recent');
  if (!res.ok) return [];
  return res.json();
}

async function saveSearch(data: { domain: string; brandName?: string; brandLogo?: string }) {
  const res = await fetch('/api/intelligence/searches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save search');
  return res.json();
}

// =============================================================================
// API Functions for Step-by-Step Wizard
// =============================================================================

/**
 * Step 1: Fetch brand profile from URL
 */
async function fetchBrandProfile(url: string): Promise<BrandProfile> {
  const res = await fetch('/api/intelligence/brand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch brand profile' }));
    throw new Error(error.error || 'Failed to fetch brand profile');
  }
  return res.json();
}

/**
 * Step 3: Fetch competitor suggestions based on brand
 * Returns { competitors, warning? } - warning is set when using fallback data
 */
async function fetchCompetitors(brand: BrandProfile): Promise<{ competitors: SuggestedCompetitor[]; warning?: string }> {
  const res = await fetch('/api/intelligence/competitors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch competitors' }));
    throw new Error(error.error || 'Failed to fetch competitors');
  }
  const data = await res.json();
  // Handle both array (old format) and object (new format with warning)
  if (Array.isArray(data)) {
    return { competitors: data };
  }
  return { competitors: data.competitors || [], warning: data.warning };
}

/**
 * Step 4: Generate customer journey prompts
 */
async function fetchPrompts(brand: BrandProfile, competitors: string[]): Promise<CustomerPrompt[]> {
  const res = await fetch('/api/intelligence/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, competitors }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate prompts' }));
    throw new Error(error.error || 'Failed to generate prompts');
  }
  return res.json();
}

async function addTrackedPrompts(prompts: CustomerPrompt[]): Promise<{ addedCount: number; alreadyTrackedCount: number }> {
  const res = await fetch('/api/intelligence/prompts/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompts: prompts.map(({ text, stage }) => ({ text, stage })) }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to add prompts to tracking' }));
    throw new Error(error.error || 'Failed to add prompts to tracking');
  }
  return res.json();
}

/**
 * Step 5: Run full research across platforms
 */
async function runResearchApi(
  targetBrand: BrandProfile,
  yourBrandId: string,
  prompts: CustomerPrompt[],
  platforms: string[],
  competitors?: SuggestedCompetitor[]
): Promise<ResearchResults> {
  const res = await fetch('/api/intelligence/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetBrand,
      yourBrandId,
      prompts,
      platforms,
      competitors,
    }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to run research' }));
    throw new Error(error.error || 'Failed to run research');
  }
  return res.json();
}

interface IntelligenceWizardProps {
  initialBrandId?: string;
  onComplete?: (results: ResearchResults) => void;
}

// Extended state to track research loading separately
interface ExtendedWizardState extends WizardState {
  isRunningResearch: boolean; // True when running final research step
  // warning is inherited from WizardState
}

// Initial state
const INITIAL_STATE: ExtendedWizardState = {
  currentStep: 'url',
  url: '',
  brand: null,
  competitors: [],
  prompts: [],
  results: null,
  isLoading: false,
  loadingMessage: '',
  error: null,
  warning: null,
  isRunningResearch: false,
};

// Session storage key
const STORAGE_KEY = 'intelligence-wizard-state';

// Load state from sessionStorage
function loadPersistedState(): ExtendedWizardState | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);

    // Validate state - roll back if data is incomplete for current step
    let validStep = parsed.currentStep;

    // If on competitors step but no brand, go to URL
    if (validStep === 'competitors' && !parsed.brand) {
      validStep = 'url';
    }
    // If on prompts step but no competitors, go to profile (will re-fetch competitors)
    if (validStep === 'prompts' && (!parsed.competitors || parsed.competitors.length === 0)) {
      validStep = 'profile';
    }
    // If on prompts step but no prompts, go to competitors (will re-fetch prompts)
    if (validStep === 'prompts' && (!parsed.prompts || parsed.prompts.length === 0)) {
      validStep = 'competitors';
    }
    // If on results step but no results, go to prompts (if prompts exist) or competitors
    if (validStep === 'results' && !parsed.results) {
      validStep = parsed.prompts && parsed.prompts.length > 0 ? 'prompts' : 'competitors';
    }

    // Reset loading states (they shouldn't persist)
    return {
      ...parsed,
      currentStep: validStep,
      isLoading: false,
      isRunningResearch: false,
      error: null,
      loadingMessage: '',
    };
  } catch {
    return null;
  }
}

// Save state to sessionStorage
function persistState(state: ExtendedWizardState) {
  try {
    // Only save if we have meaningful progress (past URL step)
    if (state.currentStep === 'url' && !state.brand) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    // Don't save transient loading states
    const toSave = {
      currentStep: state.currentStep,
      url: state.url,
      brand: state.brand,
      competitors: state.competitors,
      prompts: state.prompts,
      results: state.results,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Storage full or unavailable - silently fail
  }
}

// Clear persisted state
function clearPersistedState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Rotate through loading messages
function useLoadingMessages(messages: string[], interval: number, isActive: boolean) {
  const [currentMessage, setCurrentMessage] = useState(messages[0]);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      indexRef.current = 0;
      setCurrentMessage(messages[0]);
      return;
    }

    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % messages.length;
      setCurrentMessage(messages[indexRef.current]);
    }, interval);

    return () => clearInterval(timer);
  }, [messages, interval, isActive]);

  return currentMessage;
}

// All available platforms for research
const RESEARCH_PLATFORMS = ['chatgpt', 'claude', 'perplexity', 'gemini', 'grok', 'deepseek'];

export function IntelligenceWizard({
  initialBrandId,
  onComplete,
}: IntelligenceWizardProps) {
  const organizationName = useActiveWorkspaceName();
  const { toast } = useToast();
  const addCompetitor = useAddCompetitor();
  const isMockPromptPreview = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('mockIntelligencePrompts') === '1';

  // Initialize from sessionStorage if available
  const [state, setState] = useState<ExtendedWizardState>(() => {
    if (isMockPromptPreview) {
      return {
        ...INITIAL_STATE,
        currentStep: 'prompts',
        url: `https://${MOCK_BRAND_PROFILE.domain}`,
        brand: MOCK_BRAND_PROFILE,
        competitors: MOCK_COMPETITORS,
        prompts: MOCK_PROMPTS,
      };
    }

    const persisted = loadPersistedState();
    return persisted || INITIAL_STATE;
  });
  const queryClient = useQueryClient();

  // Persist state changes to sessionStorage
  useEffect(() => {
    if (isMockPromptPreview) return;
    persistState(state);
  }, [isMockPromptPreview, state]);

  // Fetch recent searches from API
  const { data: recentSearches = [] } = useQuery({
    queryKey: ['intelligence', 'recent-searches'],
    queryFn: fetchRecentSearches,
    staleTime: 30_000, // Cache for 30 seconds
  });

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: saveSearch,
    onSuccess: () => {
      // Invalidate recent searches to refresh the list
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'recent-searches'] });
    },
  });

  const handleTrackPrompts = useCallback(async (prompts: CustomerPrompt[]) => {
    try {
      if (isMockPromptPreview) {
        toast({ title: 'Prompts saved to tracking', description: `${prompts.length} added.` });
        return true;
      }

      const result = await addTrackedPrompts(prompts);
      await queryClient.invalidateQueries({ queryKey: ['discovery'] });
      const detail = result.addedCount > 0
        ? `${result.addedCount} added${result.alreadyTrackedCount ? `; ${result.alreadyTrackedCount} already tracked` : ''}.`
        : 'These prompts are already in your tracked list.';
      toast({ title: 'Prompts saved to tracking', description: detail });
      return true;
    } catch (error) {
      toast({
        title: 'Could not add prompts to tracking',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'warning',
      });
      return false;
    }
  }, [isMockPromptPreview, queryClient, toast]);

  // Loading message rotation
  const loadingMessage = useLoadingMessages(
    LOADING_MESSAGES.fetchBrand,
    2000,
    state.isLoading && state.currentStep === 'profile'
  );

  useEffect(() => {
    if (!initialBrandId) return;
    let cancelled = false;
    setState((prev) => ({
      ...prev,
      isLoading: true,
      loadingMessage: 'Loading saved research...',
      error: null,
    }));

    fetch(`/api/intelligence/research/latest?brandId=${encodeURIComponent(initialBrandId)}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'No saved research found for this brand. Run a new analysis.',
          }));
          return;
        }
        if (!res.ok) throw new Error('Could not load saved research');
        const results = await res.json() as ResearchResults;
        if (!cancelled) setState((prev) => ({
          ...prev,
          results,
          currentStep: 'results',
          isLoading: false,
          isRunningResearch: false,
          error: null,
          loadingMessage: '',
        }));
      })
      .catch((error) => {
        if (!cancelled) setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Could not load saved research',
        }));
      });

    return () => { cancelled = true; };
  }, [initialBrandId]);

  // Step 1: Submit URL - immediately transition to profile step, fetch in background
  const handleUrlSubmit = useCallback(async (url: string) => {
    // Immediately transition to profile step with loading state
    setState((prev) => ({
      ...prev,
      url,
      currentStep: 'profile', // Transition immediately
      isLoading: true,
      brand: null, // Clear previous brand data
      error: null,
    }));

    try {
      // Call the brand profile API
      const brand = await fetchBrandProfile(url);

      // Update with fetched brand data
      setState((prev) => ({
        ...prev,
        brand,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to fetch brand profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze domain. Please try again.';
      // On error, go back to URL step
      setState((prev) => ({
        ...prev,
        currentStep: 'url',
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, []);

  // Step 2: Confirm brand profile - fetch competitors from API
  const handleBrandConfirm = useCallback(async (brand: BrandProfile) => {
    setState((prev) => ({
      ...prev,
      brand,
      currentStep: 'competitors',
      isLoading: true,
      competitors: [], // Reset for progressive display
      error: null,
      warning: null, // Clear previous warnings
    }));

    // Save this search to history
    saveSearchMutation.mutate({
      domain: brand.domain,
      brandName: brand.name,
      brandLogo: brand.logo,
    });

    try {
      // Fetch competitors from API
      const { competitors, warning } = await fetchCompetitors(brand);

      // Progressively reveal competitors for nice UX
      for (let i = 0; i < competitors.length; i++) {
        await delay(300);
        setState((prev) => ({
          ...prev,
          competitors: [...prev.competitors, competitors[i]],
        }));
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        warning: warning || null, // Store the warning from competitors API
      }));
    } catch (error) {
      console.error('Failed to fetch competitors:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch competitors. Please try again.';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [saveSearchMutation]);

  // Step 3: Confirm competitors - immediately transition, fetch prompts in background
  const handleCompetitorsConfirm = useCallback(async (competitors: SuggestedCompetitor[]) => {
    // Immediately transition to prompts step with loading state
    setState((prev) => ({
      ...prev,
      competitors,
      currentStep: 'prompts',
      isLoading: true,
      prompts: [], // Clear previous prompts
      error: null,
    }));

    try {
      // Get competitor names for prompt generation context
      const competitorNames = competitors.map((c) => c.name);

      // Fetch prompts from API
      const prompts = await fetchPrompts(state.brand!, competitorNames);

      // Progressively reveal prompts for nice UX
      for (let i = 0; i < prompts.length; i++) {
        await delay(80);
        setState((prev) => ({
          ...prev,
          prompts: [...prev.prompts, prompts[i]],
        }));
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to generate prompts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate prompts. Please try again.';
      // Stay on prompts step but show error
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [state.brand]);

  // Add competitor
  const handleAddCompetitor = useCallback(async (domain: string) => {
    const newCompetitor: SuggestedCompetitor = {
      id: `comp-${Date.now()}`,
      name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
      domain,
      logo: `https://logo.clearbit.com/${domain}`,
      reason: 'Manually added competitor for comparison.',
    };

    setState((prev) => ({
      ...prev,
      competitors: [...prev.competitors, newCompetitor],
    }));
  }, []);

  // Remove competitor
  const handleRemoveCompetitor = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((c) => c.id !== id),
    }));
  }, []);

  // Add prompt
  const handleAddPrompt = useCallback((prompt: CustomerPrompt) => {
    setState((prev) => ({
      ...prev,
      prompts: [...prev.prompts, prompt],
    }));
  }, []);

  // Edit prompt
  const handleEditPrompt = useCallback((id: string, text: string) => {
    setState((prev) => ({
      ...prev,
      prompts: prev.prompts.map((p) =>
        p.id === id ? { ...p, text } : p
      ),
    }));
  }, []);

  // Remove prompt
  const handleRemovePrompt = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      prompts: prev.prompts.filter((p) => p.id !== id),
    }));
  }, []);

  // Step 4: Run research - calls the research API
  const handleRunResearch = useCallback(async (prompts: CustomerPrompt[]) => {
    setState((prev) => ({
      ...prev,
      prompts,
      isLoading: true,
      isRunningResearch: true, // Mark that we're running research
      error: null,
    }));

    try {
      // Call the research API with all collected data
      const results = await runResearchApi(
        state.brand!,
        organizationName, // User's brand for comparison
        prompts,
        RESEARCH_PLATFORMS,
        state.competitors
      );
      setState((prev) => ({
        ...prev,
        results,
        currentStep: 'results',
        isLoading: false,
        isRunningResearch: false,
      }));

      onComplete?.(results);
    } catch (error) {
      console.error('Failed to run research:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to run research. Please try again.';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isRunningResearch: false,
      }));
    }
  }, [state.brand, state.competitors, onComplete, queryClient]);

  // Navigation
  const handleBack = useCallback(() => {
    setState((prev) => {
      const stepOrder: WizardStep[] = ['url', 'profile', 'competitors', 'prompts', 'results'];
      const currentIndex = stepOrder.indexOf(prev.currentStep);
      if (currentIndex > 0) {
        return {
          ...prev,
          currentStep: stepOrder[currentIndex - 1],
          error: null,
        };
      }
      return prev;
    });
  }, []);

  // Research another (reset wizard)
  const handleResearchAnother = useCallback(() => {
    clearPersistedState();
    setState({
      ...INITIAL_STATE,
      // Keep recent searches
    });
  }, []);

  const handleAddAsCompetitor = useCallback(async () => {
    const brand = state.results?.brand;
    if (!brand) return false;
    try {
      await addCompetitor.mutateAsync({
        name: brand.name,
        domain: brand.domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        score: state.results?.score ?? 0,
        platforms: (state.results?.platforms ?? []).filter((p) => p.isActive).map((p) => p.id),
      });
      return true;
    } catch (error) {
      toast({
        title: 'Could not add competitor',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [state.results, addCompetitor, toast]);

  // Full-page loading overlay for research
  if (state.isRunningResearch) {
    const promptCount = state.prompts.length;
    const brandName = state.brand?.name || 'brand';

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-figma-blue animate-spin mb-6" />
        <p className="text-figma-md font-medium text-figma-primary mb-2">
          Analyzing {brandName}
        </p>
        <p className="text-figma-sm text-figma-secondary text-center max-w-md">
          Testing {promptCount} prompts across 6 AI platforms to measure visibility, sentiment, and citations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar - hidden on results */}
      {state.currentStep !== 'results' && (
        <ProgressBar currentStep={state.currentStep} />
      )}

      {/* Step Content */}
      {state.currentStep === 'url' && (
        <EnterUrlStep
          initialUrl={state.url}
          recentSearches={recentSearches}
          isLoading={state.isLoading}
          error={state.error}
          onSubmit={handleUrlSubmit}
        />
      )}

      {state.currentStep === 'profile' && (
        <BrandProfileStep
          brand={state.brand}
          isLoading={state.isLoading}
          loadingMessage={loadingMessage}
          onBack={handleBack}
          onContinue={handleBrandConfirm}
        />
      )}

      {state.currentStep === 'competitors' && state.brand && (
        <SuggestedCompetitorsStep
          brand={state.brand}
          competitors={state.competitors}
          isLoading={state.isLoading}
          warning={state.warning}
          onBack={handleBack}
          onContinue={handleCompetitorsConfirm}
          onAddCompetitor={handleAddCompetitor}
          onRemoveCompetitor={handleRemoveCompetitor}
        />
      )}

      {state.currentStep === 'prompts' && state.brand && (
        <CustomerPromptsStep
          brand={state.brand}
          prompts={state.prompts}
          isLoading={state.isLoading}
          error={state.error}
          onBack={handleBack}
          onRunResearch={handleRunResearch}
          onTrackPrompts={handleTrackPrompts}
          onAddPrompt={handleAddPrompt}
          onEditPrompt={handleEditPrompt}
          onRemovePrompt={handleRemovePrompt}
          onRetry={() => handleCompetitorsConfirm(state.competitors)}
        />
      )}

      {state.currentStep === 'results' && state.results && (
        <ResultsPage
          results={state.results}
          onResearchAnother={handleResearchAnother}
          onAddAsCompetitor={handleAddAsCompetitor}
          userBrandName={organizationName}
          userBrandLogo={companyLogoUrl('acme.com')}
        />
      )}
    </div>
  );
}
