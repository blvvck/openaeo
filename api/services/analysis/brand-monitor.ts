import type { InsertPrompt, TopicVisibilityMetric, CompetitorVisibilityMetric, CitationSourceMetric, Analytics, Prompt } from "@shared/schema";
import { storage } from "../../data";
import { currentPrismaTransaction, currentWorkspaceId, runInWorkspaceTransaction } from "../../context/workspace-context";
import { prismaRoot } from "../../prisma";
import { domainFromUrl, extractUrls, profileBrandWebsite } from "../site-intelligence/site-profiler";
import { identifyCompetitorsInText, generateTopicPrompts, suggestBrandTopics } from "../ai/brand-research";
import { PlatformRouter } from "../platforms/router";
import type { PlatformResponse } from "../platforms/types";
import { getActiveBrandConfig } from "../brand-config";
import { getPriorityManager } from "../refresh/priority-manager";

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

  private withWorkspaceData<T>(operation: () => Promise<T>): Promise<T> {
    if (currentPrismaTransaction()) return operation();
    if (!this.workspaceId) return Promise.reject(new Error("Workspace context is required for data access"));
    return runInWorkspaceTransaction(prismaRoot, this.workspaceId, operation);
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
      if (!this.brandName) {
        this.brandName = (await this.withWorkspaceData(() => getActiveBrandConfig()))?.name || "";
      }

      let promptQueue: Array<{ prompt: Prompt | null; text: string; topicId: number | null }> = [];
      if (savedPrompts?.length) {
        promptQueue = savedPrompts.map((prompt) => ({ prompt, text: prompt.text, topicId: prompt.topicId }));
      } else if (useExistingPrompts) {
        const prompts = await this.withWorkspaceData(() => storage.getPrompts());
        promptQueue = prompts.map((prompt) => ({ prompt, text: prompt.text, topicId: prompt.topicId }));
      } else {
        if (!this.websiteUrl) throw new Error("A public brand website URL is required to create an analysis.");
        this.report({ status: "scraping", message: "Reading the public brand website…", progress: 8 });
        const profile = await profileBrandWebsite(this.websiteUrl);
        this.brandName ||= profile.title;
        this.report({ status: "generating_prompts", message: "Finding customer topics and questions…", progress: 18 });
        const topics = await suggestBrandTopics(profile, topicCount);
        for (const topic of topics) {
          const stored = await this.withWorkspaceData(async () => {
            const existing = (await storage.getTopics()).find((candidate) => candidate.name.toLowerCase() === topic.name.toLowerCase());
            return existing || storage.createTopic(topic);
          });
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
        let prompt = item.prompt;
        try {
          prompt = prompt || await this.withWorkspaceData(() => storage.createPrompt({ text: item.text, topicId: item.topicId }));
          if (!prompt) throw new Error("Prompt could not be loaded");
          const trackedPrompt = prompt;
          const run = await PlatformRouter.analyzePromptAcrossPlatforms(item.text);
          const successfulResponses = Object.values(run.results).filter((response) => response.success);
          const competitorNamesByPlatform = new Map<PlatformResponse, string[]>();
          if (process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR) {
            for (const response of successfulResponses) {
              try {
                competitorNamesByPlatform.set(response, await identifyCompetitorsInText(response.text, this.brandName));
              } catch (error) {
                console.warn("Competitor extraction was unavailable for this response.", error);
                competitorNamesByPlatform.set(response, []);
              }
            }

          }
          await this.withWorkspaceData(async () => {
            for (const result of Object.values(run.results)) {
              await storage.logScrapeAttempt({
                promptId: trackedPrompt.id,
                platform: result.platform,
                method: result.method,
                success: result.success,
                cost: result.cost,
                errorType: result.error,
              });
            }
            for (const response of successfulResponses) {
              await this.persistResponse(trackedPrompt.id, item.text, response, competitorNamesByPlatform.get(response) || []);
            }
            if (successfulResponses.length) {
              await getPriorityManager().markRefreshed(trackedPrompt.id);
            } else {
              await getPriorityManager().markAttempted(trackedPrompt.id);
            }
          });
        } catch (error) {
          if (prompt) {
            await this.withWorkspaceData(() => getPriorityManager().markAttempted(prompt!.id)).catch(markError => {
              console.warn("Failed to record prompt attempt.", markError);
            });
          }
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

  private async persistResponse(promptId: number, promptText: string, response: PlatformResponse, competitorNames: string[]): Promise<void> {
    const mentioned = this.brandName ? response.text.toLocaleLowerCase().includes(this.brandName.toLocaleLowerCase()) : false;
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
