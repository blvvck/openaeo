import { DEMO_CONFIG } from '@/config/app';
import { AI_BOTS } from '@/components/ui/platform-icon';
import type { DashboardResponse, RecentAlertsResponse, TopInsightsResponse } from '@shared/types';
import type { CompetitorCompareResponse, CompetitorMetricsResponse, CompetitorsByPlatformResponse, CompetitorsResponse } from '@shared/types/competitors';
import type { CompetitorTrendsResponse } from '@/hooks/use-competitors';

export function isDemoPreview() {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).get('mock') === 'demo';
}

const updatedAt = new Date().toISOString();
const companies = [
  { rank: 1, id: 'acme', name: DEMO_CONFIG.brandName, domain: 'acme.com', score: 78, trend: 6.2, isYou: true, mentions: 186, citationRate: 42, sentimentBonus: 5, platformCount: 5, platformScores: { chatgpt: 82, claude: 77, perplexity: 84, gemini: 71, grok: 66 }, shareOfAnswer: 34, highIntent: 62, topPrompt: 'best CRM for small businesses' },
  { rank: 2, id: 'northstar', name: 'Northstar CRM', domain: 'northstarcrm.com', score: 74, trend: 3.1, isYou: false, mentions: 172, citationRate: 38, sentimentBonus: 3, platformCount: 5, platformScores: { chatgpt: 76, claude: 73, perplexity: 69, gemini: 81, grok: 67 }, shareOfAnswer: 29, highIntent: 58, topPrompt: 'CRM tools for growing teams' },
  { rank: 3, id: 'orbit', name: 'Orbit Sales', domain: 'orbitsales.com', score: 69, trend: -1.4, isYou: false, mentions: 148, citationRate: 31, sentimentBonus: 1, platformCount: 5, platformScores: { chatgpt: 71, claude: 64, perplexity: 79, gemini: 62, grok: 70 }, shareOfAnswer: 22, highIntent: 51, topPrompt: 'sales CRM with workflow automation' },
  { rank: 4, id: 'pipedrive', name: 'Pipedrive', domain: 'pipedrive.com', score: 63, trend: 2.3, isYou: false, mentions: 121, citationRate: 27, sentimentBonus: 2, platformCount: 5, platformScores: { chatgpt: 66, claude: 72, perplexity: 59, gemini: 65, grok: 53 }, shareOfAnswer: 15, highIntent: 44, topPrompt: 'simple CRM for small sales teams' },
] as const;

const platforms = [
  { id: 'chatgpt', name: 'ChatGPT', icon: 'chatgpt', score: 82, mentions: 68, trend: 8.4, citations: 45, sentiment: 'positive' as const },
  { id: 'claude', name: 'Claude', icon: 'claude', score: 77, mentions: 51, trend: 4.2, citations: 36, sentiment: 'positive' as const },
  { id: 'perplexity', name: 'Perplexity', icon: 'perplexity', score: 84, mentions: 42, trend: 11.7, citations: 52, sentiment: 'positive' as const },
  { id: 'gemini', name: 'Gemini', icon: 'gemini', score: 71, mentions: 29, trend: 2.8, citations: 24, sentiment: 'neutral' as const },
  { id: 'grok', name: 'Grok', icon: 'grok', score: 66, mentions: 18, trend: -1.6, citations: 13, sentiment: 'neutral' as const },
];

function ranks() {
  return companies.map(company => ({
    rank: company.rank,
    id: company.id,
    name: company.name,
    domain: company.domain,
    score: company.score,
    trend: company.trend,
    isYou: company.isYou,
    topPlatforms: Object.entries(company.platformScores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id),
  }));
}

export function getDemoDashboard(): DashboardResponse {
  return {
    brandName: DEMO_CONFIG.brandName,
    period: { hasHistoricalData: true, hasDataInRange: true },
    cardSubtitles: { llmMentions: 'Brand mentions across AI platforms', competitorRankings: `How ${DEMO_CONFIG.brandName} compares with competitors`, citationSources: `Sources cited in AI answers about ${DEMO_CONFIG.brandName}`, citationFooter: '', sentimentSignal: `Sentiment in AI responses about ${DEMO_CONFIG.brandName}` },
    visibility: { score: 78, previousScore: 73, trend: 6.8, trendDirection: 'up' },
    metrics: { totalMentions: 208, mentionsTrend: 9.4, avgSentiment: 0.72, sentimentTrend: 4.1, topPlatform: { id: 'perplexity', name: 'Perplexity', icon: 'perplexity' }, activeAlerts: 2 },
    platforms,
    competitors: ranks(),
    mentions: { promptCount: 186, trend: 9.4, topTrigger: { promptText: 'best CRM for small businesses', newMentions: 24 }, newPromptCount: 18 },
    position: { rank: 1, total: 4, gapToFirst: 0, firstCompetitor: DEMO_CONFIG.brandName, topThree: ranks().slice(0, 3) },
    sentiment: { positive: 72, neutral: 21, negative: 7, trend: 4.1, sampleQuote: { text: 'Acme combines an easy setup with flexible automation for growing teams.', platform: 'ChatGPT', date: updatedAt }, platformSentiment: [{ id: 'chatgpt', sentiment: 'positive', percent: 78 }, { id: 'claude', sentiment: 'positive', percent: 74 }, { id: 'perplexity', sentiment: 'positive', percent: 81 }, { id: 'gemini', sentiment: 'neutral', percent: 58 }, { id: 'grok', sentiment: 'neutral', percent: 52 }] },
    citationSources: { owned: { percentage: 37, count: 32, sites: ['acme.com'] }, thirdParty: { percentage: 46, count: 40, sites: ['g2.com', 'capterra.com', 'forbes.com'] }, social: { percentage: 17, count: 15, sites: ['reddit.com', 'linkedin.com'] } },
    citationSourcesList: [{ domain: 'g2.com', citationCount: 24, sentiment: 'positive', platforms: ['chatgpt', 'claude', 'perplexity'] }, { domain: 'acme.com', citationCount: 19, sentiment: 'positive', platforms: ['chatgpt', 'claude', 'gemini'] }, { domain: 'reddit.com', citationCount: 15, sentiment: 'mixed', platforms: ['chatgpt', 'perplexity'] }, { domain: 'capterra.com', citationCount: 14, sentiment: 'positive', platforms: ['chatgpt', 'claude'] }, { domain: 'forbes.com', citationCount: 11, sentiment: 'positive', platforms: ['chatgpt', 'perplexity'] }],
    platformSummary: { strong: 3, average: 2, weak: 0 },
    botVisits: { total: 3526, trend: 14.2, bots: AI_BOTS.slice(0, 5).map((bot, index) => ({ id: bot.id, name: bot.name, percentage: [34, 15, 24, 12, 8][index], count: [1203, 523, 847, 412, 285][index] })) },
    insightCount: 2,
    recentMentions: [{ id: 'mention-1', platform: 'chatgpt', prompt: 'What is the best CRM for a small sales team?', snippet: 'Acme is a strong fit for small sales teams that need simple automation and clear pipeline reporting.', sentiment: 'positive', timestamp: updatedAt }, { id: 'mention-2', platform: 'perplexity', prompt: 'Compare Acme and Northstar CRM', snippet: 'Acme offers a more approachable setup, while Northstar has deeper enterprise controls.', sentiment: 'positive', timestamp: updatedAt }],
    onboarding: { complete: true, currentStep: 4, totalSteps: 4, steps: [] },
    meta: { lastUpdated: updatedAt, dataFreshness: 'live', cacheAge: 45 },
  };
}

export function getDemoAlerts(): RecentAlertsResponse {
  return { alerts: [{ id: 'alert-1', ruleId: 'visibility-rise', ruleName: 'Visibility increase', type: 'competitor_surge', severity: 'info', message: 'Acme moved into the top position for small business CRM prompts.', triggeredAt: updatedAt, read: false, data: {} }, { id: 'alert-2', ruleId: 'sentiment-change', ruleName: 'Sentiment shift', type: 'sentiment_shift', severity: 'warning', message: 'Positive mentions increased across Perplexity and ChatGPT.', triggeredAt: updatedAt, read: false, data: {} }], hasMore: false };
}

export function getDemoInsights(): TopInsightsResponse {
  return { insights: [{ id: 'insight-1', type: 'opportunity', priority: 'high', title: 'Build on your Perplexity momentum', description: 'Perplexity now drives your strongest visibility score and the largest share of citations.', impact: 'Grow citation coverage', action: 'Review the pages Perplexity cites most often.', createdAt: updatedAt, status: 'active', relatedData: { platforms: ['perplexity'] } }, { id: 'insight-2', type: 'competitor_gain', priority: 'medium', title: 'Close the gap on high-intent queries', description: 'Northstar appears more often in prompts about enterprise CRM features.', impact: 'Reach more comparison searches', action: 'Add an enterprise feature comparison page.', createdAt: updatedAt, status: 'active', relatedData: { competitors: ['northstar'] } }], totalCount: 2 };
}

export function getDemoCompetitors(): CompetitorsResponse {
  return { position: { rank: 1, total: 4, score: 78, trend: 6.2, trendLabel: 'climbing', gapToFirst: 0, leaderName: DEMO_CONFIG.brandName, averageScore: 71 }, competitors: companies.map(company => ({ ...company, topPlatforms: ranks()[company.rank - 1].topPlatforms, platformScores: { ...company.platformScores } })), insight: 'Acme leads overall, with its strongest advantage on Perplexity and ChatGPT.', meta: { lastUpdated: updatedAt, dataFreshness: 'live', cacheAge: 45 } };
}

export function getDemoPlatformRanks(): CompetitorsByPlatformResponse {
  return { platforms: platforms.map(platform => ({ platformId: platform.id, platformName: platform.name, rankings: companies.map(company => ({ rank: company.rank, competitorId: company.id, competitorName: company.name, score: (company.platformScores as Record<string, number>)[platform.id] ?? company.score, isYou: company.isYou })) })), insight: 'Acme leads on Perplexity and ChatGPT; Northstar is strongest on Gemini.', meta: { lastUpdated: updatedAt, dataFreshness: 'live', cacheAge: 45 } };
}

export function getDemoCompare(id: string): CompetitorCompareResponse {
  const all = getDemoCompetitors().competitors;
  const you = all[0];
  const them = all.find(company => company.id === id) ?? all[1];
  return { you, them, metrics: [{ metric: 'Visibility score', yourValue: you.score, theirValue: them.score, difference: you.score - them.score, isPositive: you.score >= them.score }, { metric: 'Share of answer', yourValue: `${you.shareOfAnswer}%`, theirValue: `${them.shareOfAnswer}%`, difference: `${(you.shareOfAnswer ?? 0) - (them.shareOfAnswer ?? 0)}%`, isPositive: (you.shareOfAnswer ?? 0) >= (them.shareOfAnswer ?? 0) }, { metric: 'High-intent coverage', yourValue: `${you.highIntent}%`, theirValue: `${them.highIntent}%`, difference: `${(you.highIntent ?? 0) - (them.highIntent ?? 0)}%`, isPositive: (you.highIntent ?? 0) >= (them.highIntent ?? 0) }], platformComparison: platforms.map(platform => ({ platformId: platform.id, platformName: platform.name, yourScore: (you.platformScores as Record<string, number>)[platform.id] ?? you.score, theirScore: (them.platformScores as Record<string, number>)[platform.id] ?? them.score, delta: ((you.platformScores as Record<string, number>)[platform.id] ?? you.score) - ((them.platformScores as Record<string, number>)[platform.id] ?? them.score) })), insight: `Acme leads ${them.name} by ${you.score - them.score} points overall.`, meta: { lastUpdated: updatedAt, dataFreshness: 'live', cacheAge: 45 } };
}

export function getDemoMetrics(): CompetitorMetricsResponse {
  return { yourRank: { rank: 1, totalCompetitors: 4, change: -1, competitors: companies.map(company => ({ name: company.name, rank: company.rank, isYou: company.isYou, domain: company.domain, score: company.score })) }, shareOfAnswer: { percentage: 34, trend: 4.8, trackedPrompts: 186, platforms: platforms.map(platform => ({ platform: platform.name, percentage: Math.round(platform.mentions / 2.08) })), competitorShares: companies.map(company => ({ name: company.name, isYou: company.isYou, rank: company.rank, shares: company.platformScores })) }, highIntent: { percentage: 62, trend: 7.2, covered: 31, total: 50, queries: [{ query: 'best CRM for small businesses', topic: 'Best', coverage: 88 }, { query: 'Acme vs Northstar CRM', topic: 'Comparison', coverage: 76 }, { query: 'affordable CRM pricing', topic: 'Pricing', coverage: 64 }] }, citationRate: { percentage: 42, trend: 5.4, totalCitations: 87, sources: getDemoDashboard().citationSources }, competitivePressure: { netWins: 12, takeovers: 18, losses: 6, competitors: companies.slice(1).map(company => ({ name: company.name, delta: company.rank === 2 ? 5 : -2, domain: company.domain })) }, meta: { lastUpdated: updatedAt, dataFreshness: 'live', cacheAge: 45, hasTrackedData: true } };
}

export function getDemoTrends(range: string): CompetitorTrendsResponse {
  const count = range === '7d' ? 7 : range === '30d' ? 6 : 8;
  const step = range === '7d' ? 1 : range === '30d' ? 5 : 30;
  const points = Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.now() - (count - index - 1) * step * 86400000).toISOString().slice(0, 10);
    const progress = index / Math.max(1, count - 1) - 1;
    return companies.map(company => ({
      date,
      competitorId: company.id,
      competitorName: company.name,
      isYou: company.isYou,
      visibility: Math.round(company.score + progress * company.trend * 0.6),
      citations: Math.max(0, Math.round(company.citationRate + progress * company.trend * 0.35)),
      position: company.rank,
    }));
  }).flat();
  return { points, competitors: companies.map(({ id, name, isYou }) => ({ id, name, isYou })), timeRange: range, interval: range === '7d' ? 'day' : range === '30d' ? 'week' : 'month', hasHistoricalData: true, hasDataInRange: true };
}
