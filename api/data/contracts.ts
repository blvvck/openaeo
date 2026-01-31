import type {
  Analytics,
  Competitor,
  CompetitorVisibilityMetric,
  InsertAnalytics,
  InsertCompetitor,
  InsertPrompt,
  InsertResponse,
  InsertScrapeAttempt,
  InsertSource,
  InsertTopic,
  Prompt,
  TopicPromptContext,
  Response,
  PromptResponseContext,
  ScrapeAttempt,
  Source,
  CitationSourceMetric,
  Topic,
  TopicVisibilityMetric,
} from "@shared/schema";

export interface WorkspaceRepository {
  getTopics(): Promise<Topic[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  getTopicById(id: number): Promise<Topic | undefined>;
  getPrompts(): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  getPromptById(id: number): Promise<Prompt | undefined>;
  getPromptsWithTopics(): Promise<TopicPromptContext[]>;
  getPromptsByTopic(topicId: number): Promise<Prompt[]>;
  updatePrompt(id: number, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  deletePrompt(id: number): Promise<boolean>;
  getResponses(): Promise<Response[]>;
  createResponse(response: InsertResponse): Promise<Response>;
  getResponseById(id: number): Promise<Response | undefined>;
  getResponsesWithPrompts(): Promise<PromptResponseContext[]>;
  getRecentResponses(limit?: number): Promise<PromptResponseContext[]>;
  getResponsesInTimeRange(startDate: Date, endDate: Date): Promise<PromptResponseContext[]>;
  getTrendCounts(startDate: Date, endDate: Date, interval?: "day" | "week" | "month"): Promise<{ date: string; total: number; mentions: number }[]>;
  getTrendCountsByPlatform(startDate: Date, endDate: Date, interval?: "day" | "week" | "month"): Promise<{ date: string; platform: string; total: number; mentions: number }[]>;
  getCompetitors(): Promise<Competitor[]>;
  createCompetitor(competitor: InsertCompetitor): Promise<Competitor>;
  getCompetitorByName(name: string): Promise<Competitor | undefined>;
  updateCompetitorMentionCount(name: string, increment: number): Promise<void>;
  deleteCompetitor(id: number): Promise<boolean>;
  getSources(): Promise<Source[]>;
  createSource(source: InsertSource): Promise<Source>;
  getSourceByDomain(domain: string): Promise<Source | undefined>;
  updateSourceCitationCount(domain: string, increment: number): Promise<void>;
  getLatestAnalytics(): Promise<Analytics | undefined>;
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  getTopicAnalysis(): Promise<TopicVisibilityMetric[]>;
  getCompetitorAnalysis(): Promise<CompetitorVisibilityMetric[]>;
  getSourceAnalysis(): Promise<CitationSourceMetric[]>;
  getLatestResponses(): Promise<PromptResponseContext[]>;
  getLatestPrompts(): Promise<Prompt[]>;
  clearAllPrompts(): Promise<void>;
  clearAllResponses(): Promise<void>;
  clearAllCompetitors(): Promise<void>;
  logScrapeAttempt(attempt: InsertScrapeAttempt): Promise<ScrapeAttempt>;
}
