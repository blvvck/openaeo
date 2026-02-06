

export interface BrandProfile {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  description: string;
  industries: string[]; // Selected industries
  suggestedIndustries: string[]; // LLM-suggested industries to choose from
  warning?: string; // Set when using fallback data (LLM API failed)
}

export interface SuggestedCompetitor {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  reason: string;
}

export type JourneyStage = 'problem_aware' | 'exploring' | 'comparing_tradeoffs' | 'deciding' | 'onboarding' | 'power_user';

export interface CustomerPrompt {
  id: string;
  text: string;
  stage: JourneyStage;
}

export interface PlatformResult {
  id: string;
  name: string;
  isActive: boolean;
  score: number;
  mentions: number;
  sentiment: 'positive' | 'mixed' | 'negative' | null;
  citationRate: number | null;
}

export interface PromptResult {
  promptId: string;
  promptText: string;
  results: Array<{
    platformId: string;
    mentioned: boolean;
    position?: number;
    summary: string;
    sentiment: 'positive' | 'mixed' | 'negative' | null;
  }>;
}

export interface CompetitorResult {
  id: string;
  name: string;
  isTarget: boolean;
  score: number;
  mentions: number;
  sentiment: 'positive' | 'mixed' | 'negative';
  deltaVsTarget: number;
}

// Single brand's metrics
export interface BrandMetrics {
  shareOfAnswer: number; // percentage
  shareOfAnswerDetail: string; // e.g., "9 of 13 prompts"
  shareOfAnswerPrompts: string[]; // actual prompts they appeared in
  avgPosition: number; // e.g., 2.3
  avgPositionDetail: string; // e.g., "Range: #1–#5"
  avgPositionPrompts: string[]; // prompts where they ranked #1
  citationRate: number; // percentage
  citationRateDetail: string; // e.g., "47 citations"
  citationRatePrompts: string[]; // prompts where they got cited
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  sentimentQuote: string;
  platformSentiments: Array<{
    platformId: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>; // Example quote showing sentiment
}

// H2H metrics comparing target brand vs your brand
export interface H2HMetrics {
  totalPrompts: number;
  // Target brand (the one being researched)
  target: BrandMetrics;
  // Your brand (for comparison)
  you: BrandMetrics;
}

export interface ResearchResults {
  brand: BrandProfile;
  score: number;
  activePlatforms: number;
  platforms: PlatformResult[];
  promptResults: PromptResult[]; // Target brand's prompt results
  yourPromptResults: PromptResult[]; // Your brand's prompt results
  insights: {
    strengths: string[];
    gaps: string[];
    opportunities: string[];
  };
  yourInsights: {
    strengths: string[];
    gaps: string[];
    opportunities: string[];
  };
  competitorComparison: CompetitorResult[];
  h2hMetrics: H2HMetrics; // NEW: H2H metrics for hero cards
  completedAt: string;
  reportId?: string;
}

export type WizardStep = 'url' | 'profile' | 'competitors' | 'prompts' | 'results';

export interface WizardState {
  currentStep: WizardStep;
  url: string;
  brand: BrandProfile | null;
  competitors: SuggestedCompetitor[];
  prompts: CustomerPrompt[];
  results: ResearchResults | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  warning: string | null; // Non-blocking warning (e.g., using fallback data)
}

export const INDUSTRY_OPTIONS = [
  'Marketing Technology',
  'Sales & CRM',
  'Developer Tools',
  'E-commerce',
  'Healthcare',
  'Finance',
  'Education',
  'Media & Entertainment',
  'Other',
] as const;

export type Industry = typeof INDUSTRY_OPTIONS[number];

export const JOURNEY_STAGES: Record<JourneyStage, { label: string; description: string }> = {
  problem_aware: {
    label: 'Problem Aware',
    description: 'why, issues, challenges...',
  },
  exploring: {
    label: 'Exploring',
    description: 'best, top, options...',
  },
  comparing_tradeoffs: {
    label: 'Comparing',
    description: 'vs, compare, pros/cons...',
  },
  deciding: {
    label: 'Deciding',
    description: 'pricing, worth it...',
  },
  onboarding: {
    label: 'Onboarding',
    description: 'setup, tutorial...',
  },
  power_user: {
    label: 'Power User',
    description: 'API, integrate...',
  },
} as const;
