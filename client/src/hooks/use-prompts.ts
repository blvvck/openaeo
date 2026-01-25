/**
 * Prompts API Hooks
 *
 * React Query hooks for the Prompts page.
 * Uses mock data generators until backend endpoints are implemented.
 *
 * Endpoints (when ready):
 * - GET /api/discovery/overview — Funnel coverage stats
 * - GET /api/discovery/prompts — Paginated prompt list
 * - GET /api/discovery/prompts/:id — Single prompt detail
 * - GET /api/discovery/topics — Available topic filters
 * - GET /api/discovery/trending — Trending prompts
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type {
  FunnelCoverageResponse,
  PromptsResponse,
  PromptDetailResponse,
  TopicsResponse,
  TrendingPromptsResponse,
  BuyerJourneyStage,
  Sentiment,
  TimeRangePreset,
} from '@shared/types';

// =============================================================================
// Mock Data Generators
// =============================================================================

function generateMockFunnelCoverage(): FunnelCoverageResponse {
  const stages = [
    { id: 'problem-aware' as BuyerJourneyStage, coverage: 12, promptCount: 45, mentionCount: 5 },
    { id: 'solution-seeking' as BuyerJourneyStage, coverage: 34, promptCount: 89, mentionCount: 30 },
    { id: 'comparing' as BuyerJourneyStage, coverage: 72, promptCount: 156, mentionCount: 112 },
    { id: 'buying' as BuyerJourneyStage, coverage: 45, promptCount: 78, mentionCount: 35 },
    { id: 'using' as BuyerJourneyStage, coverage: 28, promptCount: 52, mentionCount: 15 },
  ];

  const stageNames: Record<BuyerJourneyStage, string> = {
    'problem-aware': 'Problem aware',
    'solution-seeking': 'Solution seeking',
    'comparing': 'Comparing',
    'buying': 'Buying',
    'using': 'Using',
  };

  return {
    stages: stages.map(s => ({
      ...s,
      name: stageNames[s.id],
      trend: Math.floor(Math.random() * 20) - 10,
    })),
    totalPrompts: stages.reduce((sum, s) => sum + s.promptCount, 0),
    totalMentions: stages.reduce((sum, s) => sum + s.mentionCount, 0),
    strongestStage: 'comparing',
    weakestStage: 'problem-aware',
    insight: 'Strong in comparison queries (72%). Focus on problem-aware content to capture buyers earlier in their journey.',
    meta: {
      cacheAge: 120,
      lastUpdated: new Date().toISOString(),
      dataFreshness: 'live',
    },
  };
}

function generateMockPrompts(
  stage?: BuyerJourneyStage,
  topic?: string,
  search?: string,
  limit: number = 25,
  offset: number = 0
): PromptsResponse {
  const samplePrompts = [
    { text: 'best CRM software for small businesses', stage: 'comparing' as BuyerJourneyStage, topic: 'pricing' },
    { text: 'salesforce vs hubspot comparison', stage: 'comparing' as BuyerJourneyStage, topic: 'features' },
    { text: 'how to automate lead generation', stage: 'problem-aware' as BuyerJourneyStage, topic: 'automation' },
    { text: 'CRM pricing comparison 2026', stage: 'buying' as BuyerJourneyStage, topic: 'pricing' },
    { text: 'what is CRM software', stage: 'problem-aware' as BuyerJourneyStage, topic: 'general' },
    { text: 'top CRM tools for startups', stage: 'solution-seeking' as BuyerJourneyStage, topic: 'features' },
    { text: 'how to migrate from spreadsheets to CRM', stage: 'solution-seeking' as BuyerJourneyStage, topic: 'integrations' },
    { text: 'CRM implementation best practices', stage: 'using' as BuyerJourneyStage, topic: 'support' },
    { text: 'free CRM alternatives', stage: 'comparing' as BuyerJourneyStage, topic: 'pricing' },
    { text: 'enterprise CRM solutions', stage: 'solution-seeking' as BuyerJourneyStage, topic: 'features' },
    { text: 'CRM integration with email marketing', stage: 'buying' as BuyerJourneyStage, topic: 'integrations' },
    { text: 'how to train team on CRM', stage: 'using' as BuyerJourneyStage, topic: 'support' },
  ];

  const stageNames: Record<BuyerJourneyStage, string> = {
    'problem-aware': 'Problem aware',
    'solution-seeking': 'Solution seeking',
    'comparing': 'Comparing',
    'buying': 'Buying',
    'using': 'Using',
  };

  const sentiments: Sentiment[] = ['positive', 'neutral', 'negative', 'mixed'];
  const platforms = ['chatgpt', 'claude', 'perplexity', 'gemini', 'grok'];

  let filtered = samplePrompts;

  if (stage) {
    filtered = filtered.filter(p => p.stage === stage);
  }

  if (topic) {
    filtered = filtered.filter(p => p.topic === topic);
  }

  if (search) {
    const lowerSearch = search.toLowerCase();
    filtered = filtered.filter(p => p.text.toLowerCase().includes(lowerSearch));
  }

  // Generate more prompts if needed
  while (filtered.length < limit + offset) {
    const base = samplePrompts[filtered.length % samplePrompts.length];
    filtered.push({
      ...base,
      text: `${base.text} (variation ${filtered.length})`,
    });
  }

  const prompts = filtered.slice(offset, offset + limit).map((p, i) => ({
    id: `prompt-${offset + i}`,
    text: p.text,
    stage: p.stage,
    stageName: stageNames[p.stage],
    topic: p.topic,
    topicName: p.topic?.charAt(0).toUpperCase() + (p.topic?.slice(1) || ''),
    platforms: platforms.slice(0, 2 + Math.floor(Math.random() * 4)),
    mentions: 20 + Math.floor(Math.random() * 100),
    trend: Math.floor(Math.random() * 30) - 10,
    firstSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeen: new Date().toISOString(),
    dominantSentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
    citationCount: Math.floor(Math.random() * 15),
  }));

  return {
    prompts,
    total: filtered.length,
    hasMore: offset + limit < filtered.length,
    meta: {
      cacheAge: 120,
      lastUpdated: new Date().toISOString(),
      dataFreshness: 'live',
    },
  };
}

function generateMockTrendingPrompts(): TrendingPromptsResponse {
  const stageNames: Record<BuyerJourneyStage, string> = {
    'problem-aware': 'Problem aware',
    'solution-seeking': 'Solution seeking',
    'comparing': 'Comparing',
    'buying': 'Buying',
    'using': 'Using',
  };

  return {
    prompts: [
      {
        id: 'trending-1',
        text: 'best AI-powered CRM 2026',
        stage: 'comparing',
        stageName: stageNames['comparing'],
        topic: 'features',
        topicName: 'Features',
        platforms: ['chatgpt', 'claude', 'perplexity', 'gemini'],
        mentions: 47,
        trend: 156,
        trendRank: 1,
        firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
        dominantSentiment: 'positive',
        citationCount: 8,
      },
      {
        id: 'trending-2',
        text: 'CRM with built-in AI assistant',
        stage: 'solution-seeking',
        stageName: stageNames['solution-seeking'],
        topic: 'features',
        topicName: 'Features',
        platforms: ['chatgpt', 'claude'],
        mentions: 38,
        trend: 89,
        trendRank: 2,
        firstSeen: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
        dominantSentiment: 'positive',
        citationCount: 5,
      },
      {
        id: 'trending-3',
        text: 'how to use AI for sales automation',
        stage: 'problem-aware',
        stageName: stageNames['problem-aware'],
        topic: 'automation',
        topicName: 'Automation',
        platforms: ['chatgpt', 'perplexity', 'gemini'],
        mentions: 31,
        trend: 67,
        trendRank: 3,
        firstSeen: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
        dominantSentiment: 'neutral',
        citationCount: 3,
      },
      {
        id: 'trending-4',
        text: 'CRM pricing trends 2026',
        stage: 'buying',
        stageName: stageNames['buying'],
        topic: 'pricing',
        topicName: 'Pricing',
        platforms: ['chatgpt', 'claude'],
        mentions: 28,
        trend: 52,
        trendRank: 4,
        firstSeen: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
        dominantSentiment: 'mixed',
        citationCount: 4,
      },
      {
        id: 'trending-5',
        text: 'best CRM for remote teams',
        stage: 'comparing',
        stageName: stageNames['comparing'],
        topic: 'features',
        topicName: 'Features',
        platforms: ['chatgpt', 'gemini'],
        mentions: 24,
        trend: 43,
        trendRank: 5,
        firstSeen: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
        dominantSentiment: 'positive',
        citationCount: 2,
      },
    ],
  };
}

function generateMockTopics(): TopicsResponse {
  return {
    topics: [
      { id: 'pricing', name: 'Pricing', promptCount: 89 },
      { id: 'features', name: 'Features', promptCount: 156 },
      { id: 'integrations', name: 'Integrations', promptCount: 67 },
      { id: 'support', name: 'Support', promptCount: 34 },
      { id: 'security', name: 'Security', promptCount: 28 },
      { id: 'automation', name: 'Automation', promptCount: 45 },
      { id: 'general', name: 'General', promptCount: 112 },
    ],
  };
}

function generateMockPromptDetail(promptId: string): PromptDetailResponse {
  const stageNames: Record<BuyerJourneyStage, string> = {
    'problem-aware': 'Problem aware',
    'solution-seeking': 'Solution seeking',
    'comparing': 'Comparing',
    'buying': 'Buying',
    'using': 'Using',
  };

  return {
    id: promptId,
    text: 'best CRM software for small businesses',
    stage: 'comparing',
    stageName: stageNames['comparing'],
    topic: 'pricing',
    topicName: 'Pricing',
    platforms: ['chatgpt', 'claude', 'perplexity', 'gemini'],
    mentions: 47,
    trend: 12,
    firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeen: new Date().toISOString(),
    dominantSentiment: 'positive',
    citationCount: 12,
    platformDetails: [
      {
        platformId: 'chatgpt',
        platformName: 'ChatGPT',
        mentioned: true,
        sentiment: 'positive',
        snippet: 'Acme is a popular choice for small businesses looking for an affordable CRM solution with robust features.',
      },
      {
        platformId: 'claude',
        platformName: 'Claude',
        mentioned: true,
        sentiment: 'positive',
        snippet: 'Consider Acme for its team collaboration features and competitive pricing.',
      },
      {
        platformId: 'perplexity',
        platformName: 'Perplexity',
        mentioned: true,
        sentiment: 'neutral',
        snippet: 'Acme offers standard CRM features with a focus on small business needs.',
      },
      {
        platformId: 'gemini',
        platformName: 'Gemini',
        mentioned: false,
      },
      {
        platformId: 'grok',
        platformName: 'Grok',
        mentioned: true,
        sentiment: 'negative',
        snippet: 'Acme has been criticized for limited enterprise features and occasional support delays.',
      },
    ],
    competitors: [
      { id: 'hubspot', name: 'HubSpot', platformCount: 6, isYou: false, dominantSentiment: 'positive' },
      { id: 'salesforce', name: 'Salesforce', platformCount: 5, isYou: false, dominantSentiment: 'mixed' },
      { id: 'acme', name: 'Acme', platformCount: 3, isYou: true, dominantSentiment: 'positive' },
      { id: 'pipedrive', name: 'Pipedrive', platformCount: 2, isYou: false, dominantSentiment: 'positive' },
    ],
    relatedPrompts: [
      {
        id: 'related-1',
        text: 'CRM software pricing comparison',
        stage: 'comparing',
        stageName: stageNames['comparing'],
        platforms: ['chatgpt', 'claude'],
        mentions: 32,
        trend: 8,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        dominantSentiment: 'positive',
        citationCount: 5,
      },
      {
        id: 'related-2',
        text: 'best free CRM tools',
        stage: 'solution-seeking',
        stageName: stageNames['solution-seeking'],
        platforms: ['chatgpt', 'perplexity'],
        mentions: 28,
        trend: -3,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        dominantSentiment: 'neutral',
        citationCount: 3,
      },
      {
        id: 'related-3',
        text: 'salesforce vs hubspot vs pipedrive',
        stage: 'comparing',
        stageName: stageNames['comparing'],
        platforms: ['chatgpt', 'claude', 'gemini'],
        mentions: 24,
        trend: 15,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        dominantSentiment: 'positive',
        citationCount: 4,
      },
    ],
    citations: {
      owned: [
        { url: 'https://acme.com/features', displayUrl: 'acme.com/features', domain: 'acme.com', type: 'owned', platforms: ['chatgpt', 'claude', 'perplexity'] },
        { url: 'https://acme.com/pricing', displayUrl: 'acme.com/pricing', domain: 'acme.com', type: 'owned', platforms: ['chatgpt', 'claude'] },
        { url: 'https://acme.com/blog/crm-guide', displayUrl: 'acme.com/blog/crm-guide', domain: 'acme.com', type: 'owned', platforms: ['claude'] },
      ],
      thirdParty: [
        { url: 'https://g2.com/products/acme', displayUrl: 'g2.com/products/acme', domain: 'g2.com', type: 'third-party', platforms: ['chatgpt', 'perplexity', 'gemini'] },
        { url: 'https://capterra.com/acme-review', displayUrl: 'capterra.com/acme-review', domain: 'capterra.com', type: 'third-party', platforms: ['chatgpt', 'claude'] },
        { url: 'https://forbes.com/best-crm-2026', displayUrl: 'forbes.com/best-crm-2026', domain: 'forbes.com', type: 'third-party', platforms: ['perplexity'] },
      ],
      social: [
        { url: 'https://reddit.com/r/crm/acme', displayUrl: 'reddit.com/r/crm/acme', domain: 'reddit.com', type: 'social', platforms: ['chatgpt'] },
        { url: 'https://twitter.com/acme_review', displayUrl: 'twitter.com/acme_review', domain: 'twitter.com', type: 'social', platforms: ['perplexity'] },
      ],
      other: [],
      summary: {
        owned: { count: 3, percentage: 25 },
        thirdParty: { count: 3, percentage: 25 },
        social: { count: 2, percentage: 17 },
        other: { count: 4, percentage: 33 },
      },
    },
    citationInsight: 'Your owned content is being cited consistently across major platforms. Consider creating more comparison content to increase third-party citations.',
    sentimentBreakdown: {
      positive: 64,
      neutral: 20,
      negative: 16,
    },
    meta: {
      cacheAge: 120,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// =============================================================================
// API Hooks
// =============================================================================

/**
 * Fetch funnel coverage data
 */
export function useFunnelCoverage(timeRange: TimeRangePreset) {
  return useQuery<FunnelCoverageResponse>({
    queryKey: ['discovery', 'funnel-coverage', timeRange],
    queryFn: async () => {
      // TODO: Wire to GET /api/discovery/overview when ready
      // const res = await fetch(`/api/discovery/overview?timeRange=${timeRange}`);
      // if (!res.ok) throw new Error('Failed to load funnel coverage');
      // return res.json();

      // Mock data for now
      await new Promise(r => setTimeout(r, 500));
      return generateMockFunnelCoverage();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

/**
 * Fetch paginated prompts list
 */
export function usePrompts(params: {
  timeRange: TimeRangePreset;
  stage?: BuyerJourneyStage;
  topic?: string;
  search?: string;
  sentiment?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const { timeRange, stage, topic, search, sentiment, limit = 25, offset = 0, sortBy, sortDir } = params;

  return useQuery<PromptsResponse>({
    queryKey: ['discovery', 'prompts', timeRange, stage, topic, search, sentiment, limit, offset, sortBy, sortDir],
    queryFn: async () => {
      // TODO: Wire to GET /api/discovery/prompts when ready
      // const queryParams = new URLSearchParams({ timeRange, limit: String(limit), offset: String(offset) });
      // if (stage) queryParams.set('stage', stage);
      // if (topic) queryParams.set('topic', topic);
      // if (search) queryParams.set('search', search);
      // const res = await fetch(`/api/discovery/prompts?${queryParams}`);
      // if (!res.ok) throw new Error('Failed to load prompts');
      // return res.json();

      // Mock data for now
      await new Promise(r => setTimeout(r, 300));
      return generateMockPrompts(stage, topic, search, limit, offset);
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

/**
 * Fetch trending prompts
 */
export function useTrendingPrompts(timeRange: TimeRangePreset) {
  return useQuery<TrendingPromptsResponse>({
    queryKey: ['discovery', 'trending', timeRange],
    queryFn: async () => {
      // TODO: Wire to GET /api/discovery/trending when ready
      await new Promise(r => setTimeout(r, 400));
      return generateMockTrendingPrompts();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

/**
 * Fetch topic filter options
 */
export function useTopics() {
  return useQuery<TopicsResponse>({
    queryKey: ['discovery', 'topics'],
    queryFn: async () => {
      // TODO: Wire to GET /api/discovery/topics when ready
      await new Promise(r => setTimeout(r, 200));
      return generateMockTopics();
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Fetch single prompt detail
 */
export function usePromptDetail(promptId: string | null) {
  return useQuery<PromptDetailResponse>({
    queryKey: ['discovery', 'prompt', promptId],
    queryFn: async () => {
      if (!promptId) throw new Error('No prompt selected');

      // TODO: Wire to GET /api/discovery/prompts/:id when ready
      await new Promise(r => setTimeout(r, 300));
      return generateMockPromptDetail(promptId);
    },
    enabled: !!promptId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
