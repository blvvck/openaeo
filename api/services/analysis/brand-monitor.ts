import type { InsertPrompt, TopicVisibilityMetric, CompetitorVisibilityMetric, CitationSourceMetric, Analytics, Prompt } from "@shared/schema";
import { AI_PLATFORMS } from "@shared/types/platforms";
import { storage } from "../../data";
import { currentWorkspaceId } from "../../context/workspace-context";
import { domainFromUrl, extractUrls, profileBrandWebsite } from "../site-intelligence/site-profiler";
import { identifyCompetitorsInText, generateTopicPrompts, suggestBrandTopics } from "../ai/brand-research";
import { PlatformRouter } from "../platforms/router";
import type { PlatformName, PlatformResponse } from "../platforms/types";

export interface AnalysisProgress {
  status: "initializing" | "scraping" | "generating_prompts" | "testing_prompts" | "analyzing" | "complete" | "error";
  message: string;
  progress: number;
  totalPrompts?: number;
  completedPrompts?: number;
}

type RunSettings = { promptsPerTopic: number; numberOfTopics: number };

const idleProgress: AnalysisProgress = {
  status: "initializing",
  message: "Ready to start analysis.",
  progress: 0,
  totalPrompts: 0,
  completedPrompts: 0,
};
const activeRuns = new Map<string, BrandMonitor>();
const workspaceProgress = new Map<string, AnalysisProgress>();

export class BrandMonitor {
  public progressCallback?: (progress: AnalysisProgress) => void;
  private brandName = "";
  private websiteUrl = "";
  private cancelled = false;
  private progress: AnalysisProgress = { ...idleProgress };
  private workspaceId: string | null = null;

  constructor(progressCallback?: (progress: AnalysisProgress) => void) {
    this.progressCallback = progressCallback;
  }

  setBrandName(name: string): void {
    this.brandName = name.trim();
  }

  setBrandUrl(url: string): void {
    this.websiteUrl = url.trim();
  }

  cancel(): void {
    this.cancelled = true;
  }

  private report(update: Partial<AnalysisProgress>): void {
    this.progress = { ...this.progress, ...update };
    if (this.workspaceId) workspaceProgress.set(this.workspaceId, this.progress);
    this.progressCallback?.(this.progress);
  }

  async runFullAnalysis(
    useExistingPrompts = false,
    savedPrompts?: Prompt[],
    settings?: RunSettings,
  ): Promise<void> {
    this.workspaceId = currentWorkspaceId();
    if (!this.workspaceId) throw new Error("Workspace context is required to start an analysis.");
    if (activeRuns.has(this.workspaceId)) throw new Error("An analysis is already running in this workspace.");
    activeRuns.set(this.workspaceId, this);
    this.cancelled = false;
    this.progress = { ...idleProgress };
    const promptsPerTopic = Math.max(1, Math.min(50, settings?.promptsPerTopic || 5));
    const topicCount = Math.max(1, Math.min(20, settings?.numberOfTopics || 5));

    try {
      let promptQueue: Array<{ prompt: Prompt | null; text: string; topicId: number | null }> = [];
      if (savedPrompts?.length) {
        promptQueue = savedPrompts.map((prompt) => ({ prompt, text: prompt.text, topicId: prompt.topicId }));
      } else if (useExistingPrompts) {
        promptQueue = (await storage.getPrompts()).map((prompt) => ({ prompt, text: prompt.text, topicId: prompt.topicId }));
      } else {
        if (!this.websiteUrl) throw new Error("A public brand website URL is required to create an analysis.");
        this.report({ status: "scraping", message: "Reading the public brand website…", progress: 8 });
        const profile = await profileBrandWebsite(this.websiteUrl);
        this.brandName ||= profile.title;
        this.report({ status: "generating_prompts", message: "Finding customer topics and questions…", progress: 18 });
        const topics = await suggestBrandTopics(profile, topicCount);
        for (const topic of topics) {
          let stored = (await storage.getTopics()).find((candidate) => candidate.name.toLowerCase() === topic.name.toLowerCase());
          if (!stored) stored = await storage.createTopic(topic);
          const questions = await generateTopicPrompts(topic.name, topic.description, promptsPerTopic);
          promptQueue.push(...questions.map((text) => ({ prompt: null, text, topicId: stored!.id })));
        }
      }

      if (!promptQueue.length) throw new Error("There are no prompts available to analyze.");
      this.report({
        status: "testing_prompts",
        message: "Collecting responses from the configured AI providers…",
        progress: 28,
        totalPrompts: promptQueue.length,
        completedPrompts: 0,
      });

      let completed = 0;
      for (const item of promptQueue) {
        if (this.cancelled) {
          this.report({ status: "error", message: "Analysis cancelled.", progress: completed / promptQueue.length * 100 });
          return;
        }
        try {
          const prompt = item.prompt || await storage.createPrompt({ text: item.text, topicId: item.topicId });
          const run = await PlatformRouter.analyzePromptAcrossPlatforms(item.text);
          for (const result of Object.values(run.results)) {
            await storage.logScrapeAttempt({
              promptId: prompt.id,
              platform: result.platform,
              method: result.method,
              success: result.success,
              cost: result.cost,
              errorType: result.error,
            });
          }

          const response = this.selectResponse(run.results);
          if (response) await this.persistResponse(prompt.id, item.text, response);
        } catch (error) {
          console.warn("Prompt collection failed; continuing with the next prompt.", error);
        }
        completed++;
        this.report({
          status: "testing_prompts",
          message: `Processed ${completed} of ${promptQueue.length} prompts.`,
          progress: 28 + Math.round(completed / promptQueue.length * 68),
          completedPrompts: completed,
        });
      }

      this.report({ status: "complete", message: "Analysis finished.", progress: 100, completedPrompts: completed });
    } catch (error) {
      this.report({ status: "error", message: error instanceof Error ? error.message : "Analysis failed.", progress: 0 });
      throw error;
    } finally {
      if (activeRuns.get(this.workspaceId) === this) activeRuns.delete(this.workspaceId);
    }
  }

  private selectResponse(results: Record<PlatformName, PlatformResponse>): PlatformResponse | undefined {
    const preferred = AI_PLATFORMS.map((platform) => platform.id as PlatformName);
    for (const name of preferred) if (results[name]?.success) return results[name];
    return Object.values(results).find((result) => result.success);
  }

  private async persistResponse(promptId: number, promptText: string, response: PlatformResponse): Promise<void> {
    const mentioned = this.brandName ? response.text.toLocaleLowerCase().includes(this.brandName.toLocaleLowerCase()) : false;
    let competitorNames: string[] = [];
    if (process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR) {
      try { competitorNames = await identifyCompetitorsInText(response.text, this.brandName); }
      catch (error) { console.warn("Competitor extraction was unavailable for this response.", error); }
    }

    const sources = Array.from(new Set([
      ...response.citations.map((citation) => citation.url),
      ...extractUrls(response.text),
      ...extractUrls(promptText),
    ]));
    await storage.createResponse({
      promptId,
      platform: response.platform,
      text: response.text,
      brandMentioned: mentioned,
      competitorsMentioned: competitorNames,
      sources,
    });

    for (const name of competitorNames) {
      const existing = await storage.getCompetitorByName(name);
      if (existing) await storage.updateCompetitorMentionCount(name, 1);
      else await storage.createCompetitor({ name, mentionCount: 1 });
    }

    for (const sourceUrl of sources) {
      const domain = domainFromUrl(sourceUrl);
      if (!domain || domain === "example.com") continue;
      const existing = await storage.getSourceByDomain(domain);
      if (existing) await storage.updateSourceCitationCount(domain, 1);
      else await storage.createSource({ domain, url: sourceUrl, citationCount: 1 });
    }
  }

  async generateAnalytics(): Promise<Analytics> {
    const responses = await storage.getResponsesWithPrompts();
    const competitors = await storage.getCompetitors();
    const sources = await storage.getSources();
    const mentions = responses.filter((response) => response.brandMentioned).length;
    const topCompetitor = [...competitors].sort((left, right) => (right.mentionCount || 0) - (left.mentionCount || 0))[0]?.name || null;
    return storage.createAnalytics({
      totalPrompts: responses.length,
      brandMentionRate: responses.length ? mentions / responses.length * 100 : 0,
      topCompetitor,
      totalSources: sources.length,
      totalDomains: new Set(sources.map((source) => source.domain)).size,
    });
  }

  async getOverviewMetrics() {
    const responses = await storage.getResponsesWithPrompts();
    const competitors = await storage.getCompetitorAnalysis();
    const sources = await storage.getSourceAnalysis();
    const mentions = responses.filter((response) => response.brandMentioned).length;
    const topCompetitor = [...competitors].sort((left, right) => right.observedMentionCount - left.observedMentionCount)[0];
    return {
      brandMentionRate: responses.length ? mentions / responses.length * 100 : 0,
      totalPrompts: responses.length,
      topCompetitor: topCompetitor?.competitorName || "N/A",
      totalSources: sources.length,
      totalDomains: new Set(sources.map((source) => source.sourceDomain)).size,
    };
  }

  getTopicAnalysis(): Promise<TopicVisibilityMetric[]> { return storage.getTopicAnalysis(); }
  getCompetitorAnalysis(): Promise<CompetitorVisibilityMetric[]> { return storage.getCompetitorAnalysis(); }
  getSourceAnalysis(): Promise<CitationSourceMetric[]> { return storage.getSourceAnalysis(); }

  getProgress(): AnalysisProgress {
    const workspaceId = currentWorkspaceId();
    return workspaceId ? workspaceProgress.get(workspaceId) || { ...idleProgress } : this.progress;
  }
}

export const brandMonitor = new BrandMonitor();
export const analyzer = brandMonitor;

export function stopCurrentAnalysis(): void {
  const workspaceId = currentWorkspaceId();
  if (workspaceId) activeRuns.get(workspaceId)?.cancel();
}

export async function getCurrentProgress(): Promise<AnalysisProgress> {
  return brandMonitor.getProgress();
}
