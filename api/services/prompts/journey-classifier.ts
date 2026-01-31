/**
 * Journey Stage Classifier
 *
 * Classifies prompts into customer journey stages based on content.
 * Also provides API endpoints for manual stage assignment.
 */

import { prisma } from '../../prisma';
import { currentWorkspaceId } from '../../context/workspace-context';
import type { Prompt, JourneyStage } from '../../../shared/schema';

function workspaceId(): string {
  const id = currentWorkspaceId();
  if (!id) throw new Error('Workspace context is required for data access');
  return id;
}

function mapPrompt(row: Record<string, unknown>): Prompt {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as Prompt;
}

/**
 * Journey stage definitions with keywords and patterns
 */
export const JOURNEY_STAGES: Record<JourneyStage, {
  name: string;
  description: string;
  keywords: string[];
  patterns: RegExp[];
}> = {
  problem_aware: {
    name: 'Problem Aware',
    description: 'User realizes they have a problem or need',
    keywords: ['why', 'issue', 'problem', 'challenge', 'struggle', 'help', 'need', 'want'],
    patterns: [
      /why (do|does|is|are|can't|won't)/i,
      /how (do|can) i (fix|solve|deal)/i,
      /what('s| is) (wrong|the issue)/i,
    ],
  },
  exploring: {
    name: 'Exploring Options',
    description: 'User is browsing and discovering solutions',
    keywords: ['best', 'top', 'options', 'alternatives', 'list', 'recommend', 'suggest', 'popular'],
    patterns: [
      /best .* (for|to)/i,
      /top \d+ /i,
      /what (are|is) (the best|some|good)/i,
      /recommend.* (for|to)/i,
    ],
  },
  comparing_tradeoffs: {
    name: 'Comparing Trade-offs',
    description: 'User is evaluating and comparing specific options',
    keywords: ['vs', 'versus', 'compare', 'comparison', 'difference', 'better', 'pros', 'cons'],
    patterns: [
      /vs\.?|versus/i,
      /compare|comparison/i,
      /(which|what) is better/i,
      /difference between/i,
      /pros and cons/i,
    ],
  },
  deciding: {
    name: 'Making Decision',
    description: 'User is ready to make a purchase decision',
    keywords: ['worth', 'should', 'pricing', 'cost', 'buy', 'purchase', 'subscribe', 'review'],
    patterns: [
      /is .* worth (it|buying|the)/i,
      /should i (buy|get|use|try)/i,
      /(how much|what) does .* cost/i,
      /pricing|plans/i,
    ],
  },
  onboarding: {
    name: 'Onboarding',
    description: 'User is setting up or learning the basics',
    keywords: ['how to', 'setup', 'start', 'begin', 'install', 'configure', 'tutorial', 'guide'],
    patterns: [
      /how (do|to) (i )?(set up|setup|start|get started|install)/i,
      /getting started/i,
      /step.by.step/i,
      /tutorial|guide/i,
    ],
  },
  power_user: {
    name: 'Power User',
    description: 'User is looking for advanced features and integrations',
    keywords: ['integrate', 'automate', 'advanced', 'api', 'workflow', 'optimize', 'scale', 'enterprise'],
    patterns: [
      /how (do|can|to) i (integrate|automate|connect)/i,
      /api|webhook/i,
      /advanced (features|settings|usage)/i,
      /enterprise|scale/i,
    ],
  },
};

/**
 * Confidence result from classification
 */
export interface ClassificationResult {
  stage: JourneyStage;
  confidence: number;
  matchedKeywords: string[];
  matchedPatterns: number;
}

/**
 * Multi-stage classification result
 */
export interface MultiStageClassificationResult {
  stages: JourneyStage[];
  details: ClassificationResult[];
}

/**
 * All valid journey stages
 */
export const ALL_STAGES: JourneyStage[] = [
  'problem_aware',
  'exploring',
  'comparing_tradeoffs',
  'deciding',
  'onboarding',
  'power_user',
];

/**
 * Score a prompt against all journey stages
 */
function scoreAllStages(text: string): Array<{ stage: JourneyStage; score: number; matchedKeywords: string[]; matchedPatterns: number }> {
  const lowerText = text.toLowerCase();
  const results: Array<{ stage: JourneyStage; score: number; matchedKeywords: string[]; matchedPatterns: number }> = [];

  for (const stage of ALL_STAGES) {
    const stageInfo = JOURNEY_STAGES[stage];
    const matchedKeywords: string[] = [];
    let matchedPatterns = 0;

    // Check keywords
    for (const keyword of stageInfo.keywords) {
      if (lowerText.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    // Check patterns
    for (const pattern of stageInfo.patterns) {
      if (pattern.test(text)) {
        matchedPatterns++;
      }
    }

    // Calculate score: patterns are worth more than keywords
    const score = matchedKeywords.length + (matchedPatterns * 3);

    if (score > 0) {
      results.push({ stage, score, matchedKeywords, matchedPatterns });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Classify a prompt text into a journey stage (legacy single-stage)
 */
export function classifyPrompt(text: string): ClassificationResult {
  const results = scoreAllStages(text);

  // Default to exploring if no match
  if (results.length === 0) {
    return {
      stage: 'exploring',
      confidence: 0.3,
      matchedKeywords: [],
      matchedPatterns: 0,
    };
  }

  // Calculate confidence based on score difference
  const best = results[0];
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const confidence = Math.min(0.95, best.score / (totalScore || 1));

  return {
    stage: best.stage,
    confidence,
    matchedKeywords: best.matchedKeywords,
    matchedPatterns: best.matchedPatterns,
  };
}

/**
 * Classify a prompt into multiple journey stages when there's genuine match
 * Only includes stages that score >= 50% of the top score (genuine multi-stage)
 */
export function classifyPromptMulti(text: string): MultiStageClassificationResult {
  const results = scoreAllStages(text);

  // Default to exploring if no match
  if (results.length === 0) {
    return {
      stages: ['exploring'],
      details: [{
        stage: 'exploring',
        confidence: 0.3,
        matchedKeywords: [],
        matchedPatterns: 0,
      }],
    };
  }

  const topScore = results[0].score;
  const threshold = topScore * 0.5; // Must score at least 50% of top to be included
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);

  // Filter to stages that meet the threshold
  const qualifyingResults = results.filter(r => r.score >= threshold);

  return {
    stages: qualifyingResults.map(r => r.stage),
    details: qualifyingResults.map(r => ({
      stage: r.stage,
      confidence: Math.min(0.95, r.score / (totalScore || 1)),
      matchedKeywords: r.matchedKeywords,
      matchedPatterns: r.matchedPatterns,
    })),
  };
}

/**
 * Set the journey stages for a prompt (single or multiple)
 */
export async function setPromptStages(promptId: number, stages: JourneyStage[]): Promise<Prompt | null> {
  for (const stage of stages) {
    if (!ALL_STAGES.includes(stage)) {
      throw new Error(`Invalid journey stage: ${stage}`);
    }
  }

  const result = await prisma.prompts.updateMany({
    where: { id: promptId, workspace_id: workspaceId() },
    data: { journey_stages: stages },
  });
  if (!result.count) return null;
  const prompt = await prisma.prompts.findFirst({ where: { id: promptId, workspace_id: workspaceId() } });
  return prompt ? mapPrompt(prompt) : null;
}

/**
 * Set the journey stage for a prompt (legacy single-stage, wraps to array)
 */
export async function setPromptStage(promptId: number, stage: JourneyStage): Promise<Prompt | null> {
  return setPromptStages(promptId, [stage]);
}

/**
 * Auto-classify and set stages for a prompt (multi-stage)
 */
export async function autoClassifyPrompt(promptId: number): Promise<{ prompt: Prompt; classification: MultiStageClassificationResult } | null> {
  const prompt = await prisma.prompts.findFirst({ where: { id: promptId, workspace_id: workspaceId() } });

  if (!prompt) {
    return null;
  }

  const classification = classifyPromptMulti(prompt.text);

  const updatedPrompt = await prisma.prompts.update({
    where: { id: promptId },
    data: { journey_stages: classification.stages },
  });

  return { prompt: mapPrompt(updatedPrompt), classification };
}

/**
 * Get prompts by journey stage (checks if stage is in the array)
 */
export async function getPromptsByStage(stage: JourneyStage): Promise<Prompt[]> {
  const rows = await prisma.prompts.findMany({
    where: { workspace_id: workspaceId(), journey_stages: { has: stage } },
  });
  return rows.map(mapPrompt);
}

/**
 * Get prompts without journey stages
 */
export async function getUnclassifiedPrompts(): Promise<Prompt[]> {
  const rows = await prisma.prompts.findMany({
    where: { workspace_id: workspaceId(), journey_stages: { isEmpty: true } },
  });
  return rows.map(mapPrompt);
}

/**
 * Bulk auto-classify unclassified prompts (multi-stage)
 */
export async function autoClassifyUnclassified(): Promise<{
  classified: number;
  stageBreakdown: Record<JourneyStage, number>;
  multiStageCount: number;
}> {
  const unclassified = await getUnclassifiedPrompts();
  const breakdown: Record<JourneyStage, number> = {
    problem_aware: 0,
    exploring: 0,
    comparing_tradeoffs: 0,
    deciding: 0,
    onboarding: 0,
    power_user: 0,
  };
  let multiStageCount = 0;

  for (const prompt of unclassified) {
    const classification = classifyPromptMulti(prompt.text);
    await setPromptStages(prompt.id, classification.stages);

    // Track multi-stage prompts
    if (classification.stages.length > 1) {
      multiStageCount++;
    }

    // Count each stage (a prompt can count toward multiple stages)
    for (const stage of classification.stages) {
      breakdown[stage]++;
    }
  }

  return {
    classified: unclassified.length,
    stageBreakdown: breakdown,
    multiStageCount,
  };
}

/**
 * Get stage information
 */
export function getStageInfo(stage: JourneyStage): typeof JOURNEY_STAGES[JourneyStage] | null {
  return JOURNEY_STAGES[stage] || null;
}

/**
 * Get all stage information
 */
export function getAllStagesInfo(): Array<{ stage: JourneyStage } & typeof JOURNEY_STAGES[JourneyStage]> {
  return ALL_STAGES.map(stage => ({
    stage,
    ...JOURNEY_STAGES[stage],
  }));
}
