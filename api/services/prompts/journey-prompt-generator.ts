/**
 * Journey-Based Prompt Generator
 *
 * Generates realistic, human-sounding prompts organized by customer journey stages.
 * Uses templates and AI augmentation to create diverse prompt sets.
 */

export type JourneyStage =
  | 'problem_aware'      // User realizes they have a problem
  | 'exploring'          // Browsing options
  | 'comparing'          // Evaluating alternatives
  | 'deciding'           // Making the final decision
  | 'onboarding'         // First use questions
  | 'power_user';        // Advanced usage

export interface GeneratedPrompt {
  text: string;
  journeyStage: JourneyStage;
  keywords: string[];
  confidence: number;
  template?: string;
}

export interface GenerationRequest {
  keywords: string[];
  brandName: string;
  competitors?: string[];
  industry?: string;
  stages?: JourneyStage[];
  promptsPerStage?: number;
}

export interface GenerationResult {
  prompts: GeneratedPrompt[];
  metadata: {
    totalGenerated: number;
    byStage: Record<JourneyStage, number>;
    generatedAt: Date;
  };
}

// Journey stage configuration
const STAGE_CONFIG: Record<JourneyStage, {
  description: string;
  keywords: string[];
  templates: string[];
}> = {
  problem_aware: {
    description: 'User realizes they have a problem/need',
    keywords: ['why', 'problem', 'issue', 'struggling', 'challenge', 'need', 'help'],
    templates: [
      'Why do I keep having problems with {topic}?',
      'What causes {problem} when doing {task}?',
      'I\'m struggling with {topic} - what should I know?',
      'Is it normal to have issues with {topic}?',
      'What are common {topic} problems and how to avoid them?',
    ],
  },
  exploring: {
    description: 'User is browsing options',
    keywords: ['best', 'top', 'options', 'alternatives', 'list', 'recommend', 'popular'],
    templates: [
      'What are the best {topic} options in {year}?',
      'Can you recommend some good {topic} solutions?',
      'What {topic} tools are people using these days?',
      'I\'m looking for a {topic} solution - what should I consider?',
      'What are the most popular {topic} options?',
    ],
  },
  comparing: {
    description: 'User is evaluating alternatives',
    keywords: ['vs', 'versus', 'compare', 'difference', 'better', 'or', 'which'],
    templates: [
      'How does {brand} compare to {competitor}?',
      '{brand} vs {competitor} - which is better for {useCase}?',
      'What\'s the difference between {brand} and {competitor}?',
      'Should I use {brand} or {competitor} for {task}?',
      'Is {brand} better than {competitor} for {topic}?',
    ],
  },
  deciding: {
    description: 'User is making a final decision',
    keywords: ['worth', 'should', 'pricing', 'cost', 'buy', 'choose', 'right'],
    templates: [
      'Is {brand} worth it for {useCase}?',
      'Should I choose {brand} for my {project}?',
      'What are the pros and cons of using {brand}?',
      'Is {brand} the right choice for {task}?',
      'How much does {brand} cost and is it worth the price?',
    ],
  },
  onboarding: {
    description: 'User has chosen and needs help getting started',
    keywords: ['how to', 'setup', 'start', 'begin', 'get started', 'first', 'tutorial'],
    templates: [
      'How do I get started with {brand}?',
      'What\'s the best way to set up {brand}?',
      'I just signed up for {brand} - what should I do first?',
      'Can you walk me through {brand} setup for {useCase}?',
      'What are the first steps after installing {brand}?',
    ],
  },
  power_user: {
    description: 'User wants advanced features/integrations',
    keywords: ['integrate', 'automate', 'advanced', 'optimize', 'scale', 'API', 'customize'],
    templates: [
      'How do I integrate {brand} with {tool}?',
      'What are some advanced {brand} features I should know about?',
      'How can I automate {task} using {brand}?',
      'What\'s the best way to scale {brand} for {useCase}?',
      'How do I customize {brand} for {specific need}?',
    ],
  },
};

// Placeholder replacements
const PLACEHOLDERS = {
  topic: ['this', 'my work', 'development', 'my project', 'business operations'],
  problem: ['performance issues', 'reliability problems', 'scaling challenges', 'cost overruns'],
  task: ['deployment', 'data management', 'workflow automation', 'team collaboration'],
  useCase: ['small teams', 'enterprise', 'startups', 'side projects', 'production'],
  project: ['new project', 'existing system', 'team workflow', 'business'],
  tool: ['Slack', 'GitHub', 'existing tools', 'CI/CD pipeline', 'CRM'],
  year: [new Date().getFullYear().toString()],
};

/**
 * Replace placeholders in template
 */
function fillTemplate(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  // Replace remaining placeholders with random defaults
  for (const [key, values] of Object.entries(PLACEHOLDERS)) {
    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    if (pattern.test(result)) {
      const randomValue = values[Math.floor(Math.random() * values.length)];
      result = result.replace(pattern, randomValue);
    }
  }

  // Handle {specific need} and similar
  result = result.replace(/\{[^}]+\}/g, 'my needs');

  return result;
}

/**
 * Generate prompts for a specific journey stage
 */
function generateStagePrompts(
  stage: JourneyStage,
  request: GenerationRequest,
  count: number
): GeneratedPrompt[] {
  const config = STAGE_CONFIG[stage];
  const prompts: GeneratedPrompt[] = [];
  const usedTemplates = new Set<string>();

  const replacements: Record<string, string> = {
    brand: request.brandName,
    competitor: request.competitors?.[0] || 'alternatives',
  };

  // Add keyword-based replacements
  if (request.keywords.length > 0) {
    replacements.topic = request.keywords[0];
  }
  if (request.industry) {
    replacements.useCase = request.industry;
  }

  // Generate prompts from templates
  for (let i = 0; i < count && i < config.templates.length; i++) {
    const template = config.templates[i];

    // Vary competitors in comparison stage
    if (stage === 'comparing' && request.competitors && request.competitors.length > 1) {
      replacements.competitor = request.competitors[i % request.competitors.length];
    }

    const text = fillTemplate(template, replacements);

    prompts.push({
      text,
      journeyStage: stage,
      keywords: request.keywords.filter(k =>
        text.toLowerCase().includes(k.toLowerCase())
      ),
      confidence: 0.9,
      template,
    });

    usedTemplates.add(template);
  }

  // Generate variations using keywords
  for (const keyword of request.keywords) {
    if (prompts.length >= count) break;

    const keywordReplacements = { ...replacements, topic: keyword };

    for (const template of config.templates) {
      if (prompts.length >= count) break;
      if (usedTemplates.has(template)) continue;

      const text = fillTemplate(template, keywordReplacements);

      // Check for uniqueness
      if (prompts.some(p => similarText(p.text, text))) continue;

      prompts.push({
        text,
        journeyStage: stage,
        keywords: [keyword],
        confidence: 0.85,
        template,
      });
    }
  }

  return prompts.slice(0, count);
}

/**
 * Check if two texts are too similar
 */
function similarText(a: string, b: string, threshold: number = 0.7): boolean {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  const intersection = Array.from(wordsA).filter(w => wordsB.has(w)).length;
  const union = new Set(Array.from(wordsA).concat(Array.from(wordsB))).size;

  return intersection / union > threshold;
}

/**
 * Classify a prompt into a journey stage
 */
export function classifyJourneyStage(promptText: string): JourneyStage {
  const lower = promptText.toLowerCase();

  // Score each stage
  const scores: Record<JourneyStage, number> = {
    problem_aware: 0,
    exploring: 0,
    comparing: 0,
    deciding: 0,
    onboarding: 0,
    power_user: 0,
  };

  for (const [stage, config] of Object.entries(STAGE_CONFIG)) {
    for (const keyword of config.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        scores[stage as JourneyStage] += 1;
      }
    }
  }

  // Find highest scoring stage
  let maxStage: JourneyStage = 'exploring';
  let maxScore = 0;

  for (const [stage, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxStage = stage as JourneyStage;
    }
  }

  return maxStage;
}

/**
 * Generate prompts across all or specified journey stages
 */
export function generateJourneyPrompts(request: GenerationRequest): GenerationResult {
  const stages = request.stages || Object.keys(STAGE_CONFIG) as JourneyStage[];
  const promptsPerStage = request.promptsPerStage || 3;

  const allPrompts: GeneratedPrompt[] = [];
  const byStage: Record<JourneyStage, number> = {
    problem_aware: 0,
    exploring: 0,
    comparing: 0,
    deciding: 0,
    onboarding: 0,
    power_user: 0,
  };

  for (const stage of stages) {
    const stagePrompts = generateStagePrompts(stage, request, promptsPerStage);
    allPrompts.push(...stagePrompts);
    byStage[stage] = stagePrompts.length;
  }

  return {
    prompts: allPrompts,
    metadata: {
      totalGenerated: allPrompts.length,
      byStage,
      generatedAt: new Date(),
    },
  };
}

/**
 * Get journey stage info
 */
export function getStageInfo(stage: JourneyStage): {
  description: string;
  keywords: string[];
} {
  const config = STAGE_CONFIG[stage];
  return {
    description: config.description,
    keywords: config.keywords,
  };
}

/**
 * Get all journey stages with info
 */
export function getAllStages(): Array<{
  stage: JourneyStage;
  description: string;
  keywords: string[];
}> {
  return Object.entries(STAGE_CONFIG).map(([stage, config]) => ({
    stage: stage as JourneyStage,
    description: config.description,
    keywords: config.keywords,
  }));
}
