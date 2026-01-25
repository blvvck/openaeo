/**
 * Mock Data for Intelligence Wizard
 *
 * Realistic mock responses until Luna implements the backend.
 */

import type {
  BrandProfile,
  SuggestedCompetitor,
  CustomerPrompt,
  ResearchResults,
} from './types';

// Brand profile for HubSpot (Step 2)
export const MOCK_BRAND_PROFILE: BrandProfile = {
  id: 'brand-hubspot',
  name: 'HubSpot',
  domain: 'hubspot.com',
  logo: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
  description: 'CRM and marketing automation platform for growing businesses. Offers tools for sales, marketing, customer service, and content management.',
  industries: ['Marketing Technology', 'SaaS'], // User's selected industries
  suggestedIndustries: [
    'Marketing Technology',
    'SaaS',
    'CRM',
    'Sales Tools',
    'Customer Success',
    'B2B Software',
    'Automation',
    'Analytics',
  ], // LLM-suggested industries
};

// Suggested competitors (Step 3)
export const MOCK_COMPETITORS: SuggestedCompetitor[] = [
  {
    id: 'comp-salesforce',
    name: 'Salesforce',
    domain: 'salesforce.com',
    logo: 'https://logo.clearbit.com/salesforce.com',
    reason: 'Direct competitor in CRM space with enterprise focus and similar feature set across sales, marketing, and service.',
  },
  {
    id: 'comp-pipedrive',
    name: 'Pipedrive',
    domain: 'pipedrive.com',
    logo: 'https://logo.clearbit.com/pipedrive.com',
    reason: 'Sales-focused CRM targeting similar SMB market with visual pipeline management.',
  },
  {
    id: 'comp-zoho',
    name: 'Zoho CRM',
    domain: 'zoho.com',
    logo: 'https://logo.clearbit.com/zoho.com',
    reason: 'All-in-one platform competing for same SMB customers with comprehensive suite approach.',
  },
  {
    id: 'comp-activecampaign',
    name: 'ActiveCampaign',
    domain: 'activecampaign.com',
    logo: 'https://logo.clearbit.com/activecampaign.com',
    reason: 'Marketing automation overlap with strong email focus and similar pricing tier.',
  },
  {
    id: 'comp-monday',
    name: 'Monday.com',
    domain: 'monday.com',
    logo: 'https://logo.clearbit.com/monday.com',
    reason: 'Work management platform expanding aggressively into CRM with monday sales CRM.',
  },
];

// Customer prompts (Step 4) - uses 6-stage journey
export const MOCK_PROMPTS: CustomerPrompt[] = [
  // Problem Aware
  { id: 'p1', text: 'Why is managing customer data so hard?', stage: 'problem_aware' },
  { id: 'p2', text: 'Challenges with tracking sales leads', stage: 'problem_aware' },
  // Exploring
  { id: 'p3', text: 'Best CRM for small businesses', stage: 'exploring' },
  { id: 'p4', text: 'Top marketing automation tools', stage: 'exploring' },
  // Comparing
  { id: 'p5', text: 'HubSpot vs Salesforce comparison', stage: 'comparing_tradeoffs' },
  { id: 'p6', text: 'Pros and cons of marketing automation tools', stage: 'comparing_tradeoffs' },
  { id: 'p7', text: 'Which CRM is best for email marketing?', stage: 'comparing_tradeoffs' },
  // Deciding
  { id: 'p8', text: 'HubSpot pricing plans', stage: 'deciding' },
  { id: 'p9', text: 'Is HubSpot worth it for startups?', stage: 'deciding' },
  // Onboarding
  { id: 'p10', text: 'How to set up HubSpot CRM', stage: 'onboarding' },
  { id: 'p11', text: 'HubSpot tutorial for beginners', stage: 'onboarding' },
  // Power User
  { id: 'p12', text: 'HubSpot API integrations', stage: 'power_user' },
  { id: 'p13', text: 'Automate workflows in HubSpot', stage: 'power_user' },
];

// Research results (Step 5)
export const MOCK_RESULTS: ResearchResults = {
  brand: MOCK_BRAND_PROFILE,
  score: 72,
  activePlatforms: 6,
  // H2H Metrics - comparing target brand vs your brand
  h2hMetrics: {
    totalPrompts: 13,
    // Target brand (HubSpot in this case)
    target: {
      shareOfAnswer: 68,
      shareOfAnswerDetail: '9 of 13 prompts',
      shareOfAnswerPrompts: ['best CRM for small business', 'marketing automation tools', 'sales pipeline software', 'CRM with email marketing'],
      avgPosition: 2.1,
      avgPositionDetail: 'Range: #1–#4',
      avgPositionPrompts: ['best CRM software', 'marketing automation', 'free CRM tools', 'CRM for startups'],
      citationRate: 64,
      citationRateDetail: '47 citations',
      citationRatePrompts: ['HubSpot vs Salesforce', 'CRM pricing comparison', 'best free CRM'],
      sentiment: 'positive',
      sentimentScore: 78,
      sentimentQuote: 'Reliable CRM with excellent support',
      platformSentiments: [
        { platformId: 'chatgpt', sentiment: 'positive' },
        { platformId: 'claude', sentiment: 'positive' },
        { platformId: 'perplexity', sentiment: 'positive' },
        { platformId: 'gemini', sentiment: 'neutral' },
        { platformId: 'grok', sentiment: 'neutral' },
        { platformId: 'deepseek', sentiment: 'negative' },
      ],
    },
    // Your brand (for comparison)
    you: {
      shareOfAnswer: 45,
      shareOfAnswerDetail: '6 of 13 prompts',
      shareOfAnswerPrompts: ['CRM alternatives', 'simple CRM tools', 'CRM for agencies'],
      avgPosition: 3.8,
      avgPositionDetail: 'Range: #2–#6',
      avgPositionPrompts: ['affordable CRM', 'easy CRM setup'],
      citationRate: 52,
      citationRateDetail: '31 citations',
      citationRatePrompts: ['CRM comparison guide', 'best CRM reviews'],
      sentiment: 'neutral',
      sentimentScore: 52,
      sentimentQuote: 'Good features but steep learning curve',
      platformSentiments: [
        { platformId: 'chatgpt', sentiment: 'neutral' },
        { platformId: 'claude', sentiment: 'positive' },
        { platformId: 'perplexity', sentiment: 'neutral' },
        { platformId: 'grok', sentiment: 'negative' },
      ],
    },
  },
  platforms: [
    { id: 'chatgpt', name: 'ChatGPT', isActive: true, score: 85, mentions: 147, sentiment: 'positive', citationRate: 68 },
    { id: 'claude', name: 'Claude', isActive: true, score: 78, mentions: 132, sentiment: 'positive', citationRate: 72 },
    { id: 'grok', name: 'Grok', isActive: true, score: 72, mentions: 89, sentiment: 'mixed', citationRate: 54 },
    { id: 'perplexity', name: 'Perplexity', isActive: true, score: 68, mentions: 112, sentiment: 'positive', citationRate: 81 },
    { id: 'gemini', name: 'Gemini', isActive: true, score: 65, mentions: 76, sentiment: 'positive', citationRate: 59 },
    { id: 'deepseek', name: 'DeepSeek', isActive: true, score: 58, mentions: 54, sentiment: 'mixed', citationRate: 48 },
    { id: 'ai_mode', name: 'AI Mode', isActive: false, score: 0, mentions: 0, sentiment: null, citationRate: null },
    { id: 'ai_overview', name: 'AI Overview', isActive: false, score: 0, mentions: 0, sentiment: null, citationRate: null },
  ],
  promptResults: [
    {
      promptId: 'p1',
      promptText: 'What is the best CRM for small businesses?',
      results: [
        { platformId: 'chatgpt', mentioned: true, position: 2, summary: 'Mentioned as "affordable option with free tier"' },
        { platformId: 'claude', mentioned: true, position: 1, summary: 'Recommended as top choice with direct link' },
        { platformId: 'grok', mentioned: false, summary: 'Not mentioned in response' },
        { platformId: 'perplexity', mentioned: true, position: 3, summary: 'Listed as "popular choice for startups"' },
      ],
    },
    {
      promptId: 'p4',
      promptText: 'HubSpot vs Salesforce comparison',
      results: [
        { platformId: 'chatgpt', mentioned: true, position: 1, summary: 'Featured comparison with detailed pros/cons' },
        { platformId: 'claude', mentioned: true, position: 1, summary: 'Balanced comparison with recommendation' },
        { platformId: 'perplexity', mentioned: true, position: 1, summary: 'Detailed breakdown including pricing' },
      ],
    },
    {
      promptId: 'p8',
      promptText: 'HubSpot pricing plans',
      results: [
        { platformId: 'chatgpt', mentioned: true, position: 1, summary: 'Accurate pricing with tier breakdown' },
        { platformId: 'claude', mentioned: true, position: 1, summary: 'Pricing details with comparison to alternatives' },
        { platformId: 'perplexity', mentioned: true, position: 1, summary: 'Current pricing with direct links' },
      ],
    },
  ],
  // Your brand's prompt results (Acme Inc.)
  yourPromptResults: [
    {
      promptId: 'p1',
      promptText: 'What is the best CRM for small businesses?',
      results: [
        { platformId: 'chatgpt', mentioned: true, position: 4, summary: 'Mentioned as "emerging player in the space"' },
        { platformId: 'claude', mentioned: true, position: 3, summary: 'Listed among alternatives with focus on simplicity' },
        { platformId: 'grok', mentioned: true, position: 2, summary: 'Highlighted for ease of use and quick setup' },
        { platformId: 'perplexity', mentioned: false, summary: 'Not included in the recommendations' },
      ],
    },
    {
      promptId: 'p4',
      promptText: 'HubSpot vs Salesforce comparison',
      results: [
        { platformId: 'chatgpt', mentioned: false, summary: 'Not mentioned — comparison focused on major players' },
        { platformId: 'claude', mentioned: true, position: 5, summary: 'Brief mention as "lightweight alternative"' },
        { platformId: 'perplexity', mentioned: false, summary: 'Excluded from direct comparison' },
      ],
    },
    {
      promptId: 'p8',
      promptText: 'HubSpot pricing plans',
      results: [
        { platformId: 'chatgpt', mentioned: true, position: 3, summary: 'Mentioned in "more affordable alternatives" section' },
        { platformId: 'claude', mentioned: true, position: 2, summary: 'Noted as budget-friendly option for small teams' },
        { platformId: 'perplexity', mentioned: true, position: 4, summary: 'Listed in pricing comparison table' },
      ],
    },
  ],
  insights: {
    strengths: [
      'Strong presence on ChatGPT (#1 or #2 for most prompts)',
      'High citation rate (68%) — content is trusted by AI',
      'Positive sentiment across 5/6 active platforms',
      'Consistent brand mention in comparison queries',
    ],
    gaps: [
      'Not appearing on Google AI Mode or AI Overview',
      'Mixed sentiment on Grok — review mentions there',
      'Lower mention count on DeepSeek compared to peers',
    ],
    opportunities: [
      'Expand content targeting Google\'s AI features',
      'Address Grok sentiment with updated positioning',
      'DeepSeek is growing — early visibility investment pays off',
    ],
  },
  yourInsights: {
    strengths: [
      'Strong brand recognition in niche market',
      'Positive sentiment on Claude and Perplexity',
      'Good citation rate for pricing-related queries',
    ],
    gaps: [
      'Lower visibility than competitors on ChatGPT',
      'Not mentioned in "best CRM" comparison queries',
      'Missing from Grok and DeepSeek entirely',
    ],
    opportunities: [
      'Create more comparison content vs major players',
      'Improve SEO for AI-crawlable content',
      'Target emerging platforms early (Grok, DeepSeek)',
    ],
  },
  competitorComparison: [
    { id: 'hubspot', name: 'HubSpot', isTarget: true, score: 72, mentions: 610, sentiment: 'positive', deltaVsTarget: 0 },
    { id: 'salesforce', name: 'Salesforce', isTarget: false, score: 85, mentions: 892, sentiment: 'positive', deltaVsTarget: -13 },
    { id: 'pipedrive', name: 'Pipedrive', isTarget: false, score: 58, mentions: 342, sentiment: 'mixed', deltaVsTarget: 14 },
    { id: 'zoho', name: 'Zoho CRM', isTarget: false, score: 61, mentions: 287, sentiment: 'positive', deltaVsTarget: 11 },
    { id: 'activecampaign', name: 'ActiveCampaign', isTarget: false, score: 54, mentions: 198, sentiment: 'positive', deltaVsTarget: 18 },
    { id: 'monday', name: 'Monday.com', isTarget: false, score: 67, mentions: 421, sentiment: 'positive', deltaVsTarget: 5 },
  ],
  completedAt: new Date().toISOString(),
};

// Loading messages for personality
export const LOADING_MESSAGES = {
  fetchBrand: [
    'Fetching brand details...',
    'Analyzing website content...',
    'Detecting industry...',
    'Almost there...',
  ],
  suggestCompetitors: [
    'Analyzing market landscape...',
    'Identifying competitors...',
    'Evaluating relevance...',
    'Finalizing suggestions...',
  ],
  generatePrompts: [
    'Understanding customer journey...',
    'Generating awareness prompts...',
    'Creating comparison queries...',
    'Adding decision-stage prompts...',
  ],
  runResearch: [
    'Querying AI platforms...',
    'Analyzing mentions...',
    'Calculating visibility scores...',
    'Generating insights...',
    'Comparing to competitors...',
    'Finalizing report...',
  ],
};
