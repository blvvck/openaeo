import type { Prisma } from "@prisma/client";
import { z } from "zod";

type CamelCase<S extends string> = S extends `${infer Head}_${infer Letter}${infer Tail}`
  ? `${Head}${Uppercase<Letter>}${CamelCase<Tail>}`
  : S;
type CamelModel<T> = { [K in keyof T as K extends string ? CamelCase<K> : K]: T[K] };
type InsertModel<T> = Partial<Omit<T, "id" | "workspaceId" | "createdAt" | "updatedAt">>;
type Model<T> = CamelModel<T>;

export type User = Model<Prisma.usersGetPayload<{}>>;
export type Workspace = Model<Prisma.workspacesGetPayload<{}>>;
export type WorkspaceMember = Model<Prisma.workspace_membersGetPayload<{}>>;
export type Platform = Model<Prisma.platformsGetPayload<{}>>;
export type Topic = Model<Prisma.topicsGetPayload<{}>>;
export type Prompt = Model<Prisma.promptsGetPayload<{}>>;
export type Response = Model<Prisma.responsesGetPayload<{}>>;
export type Competitor = Omit<Model<Prisma.competitorsGetPayload<{}>>, "platformsFound" | "discoveredPrompts"> & {
  platformsFound: string[] | null;
  discoveredPrompts: string[] | null;
};
export type Source = Model<Prisma.sourcesGetPayload<{}>>;
export type Analytics = Model<Prisma.analyticsGetPayload<{}>>;
export type ScrapeAttempt = Model<Prisma.scrape_attemptsGetPayload<{}>>;
export type RequestQueueItem = Model<Prisma.request_queueGetPayload<{}>>;
export type Tag = Model<Prisma.tagsGetPayload<{}>>;
export type PromptTag = Model<Prisma.prompt_tagsGetPayload<{}>>;
export type Persona = Model<Prisma.personasGetPayload<{}>>;
export type PromptVariant = Model<Prisma.prompt_variantsGetPayload<{}>>;
export type VariantPerformance = Model<Prisma.variant_performanceGetPayload<{}>>;
export type SiteAudit = Model<Prisma.site_auditsGetPayload<{}>>;
export type BotVisit = Model<Prisma.bot_visitsGetPayload<{}>>;
export type ScanSchedule = Model<Prisma.scan_schedulesGetPayload<{}>>;
export type RefreshHistory = Model<Prisma.refresh_historyGetPayload<{}>>;
export type AlertRule = Model<Prisma.alert_rulesGetPayload<{}>>;
export type AlertChannel = Omit<Model<Prisma.alert_channelsGetPayload<{}>>, "config"> & { config: Record<string, unknown> };
export type AlertHistory = Model<Prisma.alert_historyGetPayload<{}>>;
export type SharedReport = Model<Prisma.shared_reportsGetPayload<{}>>;
export type PromptTemplate = Model<Prisma.prompt_templatesGetPayload<{}>>;
export type PromptTemplateVersion = Model<Prisma.prompt_template_versionsGetPayload<{}>>;
export type TemplateVariable = Model<Prisma.template_variablesGetPayload<{}>>;
export type TemplateTag = Model<Prisma.template_tagsGetPayload<{}>>;
export type PromptScheduleLink = Model<Prisma.prompt_schedule_linksGetPayload<{}>>;
export type PromptPerformanceMetrics = Model<Prisma.prompt_performance_metricsGetPayload<{}>>;
export type PromptPriorityQueueItem = Model<Prisma.prompt_priority_queueGetPayload<{}>>;
export type TemplateCategory = Model<Prisma.template_categoriesGetPayload<{}>>;
export type BrandAlias = Model<Prisma.brand_aliasesGetPayload<{}>>;
export type ResponseQualityScore = Model<Prisma.response_quality_scoresGetPayload<{}>>;
export type QualityAggregate = Model<Prisma.quality_aggregatesGetPayload<{}>>;
export type QualityAnomaly = Model<Prisma.quality_anomaliesGetPayload<{}>>;
export type Experiment = Model<Prisma.experimentsGetPayload<{}>>;
export type ExperimentVariantLink = Model<Prisma.experiment_variantsGetPayload<{}>>;
export type ExperimentResult = Model<Prisma.experiment_resultsGetPayload<{}>>;
export type UsageMetric = Model<Prisma.usage_metricsGetPayload<{}>>;
export type UsageEvent = Model<Prisma.usage_eventsGetPayload<{}>>;
export type UsageReport = Model<Prisma.usage_reportsGetPayload<{}>>;
export type UserPreferences = Model<Prisma.user_preferencesGetPayload<{}>>;
export type BrandConfig = Model<Prisma.brand_configGetPayload<{}>>;
export type PlatformSettingsRecord = Model<Prisma.platform_settingsGetPayload<{}>>;
export type NotificationPreferences = Model<Prisma.notification_preferencesGetPayload<{}>>;
export type PriorityQueueSettingsRecord = Model<Prisma.priority_queue_settingsGetPayload<{}>>;
export type RefreshSchedulingSettings = Model<Prisma.refresh_scheduling_settingsGetPayload<{}>>;
export type ExportBackupConfig = Model<Prisma.export_backup_configGetPayload<{}>>;
export type ApiRateLimitSettings = Model<Prisma.api_rate_limit_settingsGetPayload<{}>>;
export type SettingsAuditLog = Model<Prisma.settings_audit_logGetPayload<{}>>;
export type IntelligenceSearch = Model<Prisma.intelligence_searchesGetPayload<{}>>;
export type Logo = Model<Prisma.logosGetPayload<{}>>;

export type InsertUser = InsertModel<User>;
export type InsertWorkspace = InsertModel<Workspace>;
export type InsertWorkspaceMember = InsertModel<WorkspaceMember>;
export type InsertPlatform = Partial<Omit<Platform, "id" | "createdAt">> & Pick<Platform, "slug" | "name" | "rateLimitRpm" | "rateLimitConcurrent">;
export type InsertTopic = Partial<Omit<Topic, "id" | "createdAt" | "workspaceId">> & Pick<Topic, "name">;
export type InsertPrompt = Partial<Omit<Prompt, "id" | "workspaceId" | "createdAt">> & Pick<Prompt, "text">;
export type InsertResponse = Partial<Omit<Response, "id" | "workspaceId" | "createdAt">> & Pick<Response, "promptId" | "text">;
export type InsertCompetitor = Partial<Omit<Competitor, "id" | "workspaceId">> & Pick<Competitor, "name">;
export type InsertSource = Partial<Omit<Source, "id" | "workspaceId">> & Pick<Source, "domain" | "url">;
export type InsertAnalytics = InsertModel<Analytics>;
export type InsertScrapeAttempt = Partial<Omit<ScrapeAttempt, "id" | "workspaceId" | "createdAt">> & Pick<ScrapeAttempt, "platform" | "method" | "success">;
export type InsertRequestQueueItem = Partial<Omit<RequestQueueItem, "id" | "workspaceId" | "createdAt">> & Pick<RequestQueueItem, "platform">;
export type InsertTag = Partial<Omit<Tag, "id" | "workspaceId" | "createdAt">> & Pick<Tag, "name">;
export type InsertPromptTag = Omit<PromptTag, "workspaceId">;
export type InsertPersona = Partial<Omit<Persona, "id" | "workspaceId" | "createdAt">> & Pick<Persona, "name">;
export type InsertPromptVariant = InsertModel<PromptVariant>;
export type InsertVariantPerformance = InsertModel<VariantPerformance>;
export type InsertSiteAudit = Partial<Omit<SiteAudit, "id" | "workspaceId" | "createdAt">> & Pick<SiteAudit, "url" | "score" | "checks" | "recommendations">;
export type InsertBotVisit = Partial<Omit<BotVisit, "id" | "workspaceId" | "createdAt">> & Pick<BotVisit, "botType" | "userAgent" | "url" | "visitedAt">;
export type InsertScanSchedule = Partial<Omit<ScanSchedule, "id" | "workspaceId" | "createdAt">> & Pick<ScanSchedule, "frequency" | "platforms">;
export type InsertRefreshHistory = InsertModel<RefreshHistory>;
export type InsertAlertRule = Partial<Omit<AlertRule, "id" | "workspaceId" | "createdAt" | "updatedAt">> & Pick<AlertRule, "name" | "type" | "threshold">;
export type InsertAlertChannel = Partial<Omit<AlertChannel, "id" | "workspaceId" | "createdAt" | "updatedAt">> & Pick<AlertChannel, "name" | "type" | "config">;
export type InsertAlertHistory = Partial<Omit<AlertHistory, "id" | "workspaceId" | "triggeredAt" | "data" | "channelsSent">> & Pick<AlertHistory, "message"> & { data?: Record<string, unknown> | null; channelsSent?: number[] | null };
export type InsertSharedReport = InsertModel<SharedReport>;
export type InsertPromptTemplate = InsertModel<PromptTemplate>;
export type InsertPromptTemplateVersion = InsertModel<PromptTemplateVersion>;
export type InsertTemplateVariable = Partial<Omit<TemplateVariable, "id" | "createdAt">> & Pick<TemplateVariable, "name" | "label">;
export type InsertTemplateTag = InsertModel<TemplateTag>;
export type InsertPromptScheduleLink = Partial<Omit<PromptScheduleLink, "id" | "workspaceId" | "createdAt">> & Pick<PromptScheduleLink, "scheduleId">;
export type InsertPromptPerformanceMetrics = InsertModel<PromptPerformanceMetrics>;
export type InsertPromptPriorityQueueItem = InsertModel<PromptPriorityQueueItem>;
export type InsertTemplateCategory = InsertModel<TemplateCategory>;
export type InsertBrandAlias = Partial<Omit<BrandAlias, "id" | "workspaceId" | "createdAt">> & Pick<BrandAlias, "brandId" | "alias" | "aliasType">;
export type InsertResponseQualityScore = InsertModel<ResponseQualityScore>;
export type InsertQualityAggregate = InsertModel<QualityAggregate>;
export type InsertQualityAnomaly = InsertModel<QualityAnomaly>;
export type InsertExperiment = Partial<Omit<Experiment, "id" | "workspaceId" | "createdAt" | "updatedAt">> & Pick<Experiment, "name">;
export type InsertExperimentVariantLink = InsertModel<ExperimentVariantLink>;
export type InsertExperimentResult = InsertModel<ExperimentResult>;
export type InsertUsageMetric = InsertModel<UsageMetric>;
export type InsertUsageEvent = InsertModel<UsageEvent>;
export type InsertUsageReport = InsertModel<UsageReport>;
export type InsertUserPreferences = InsertModel<UserPreferences>;
export type InsertBrandConfig = InsertModel<BrandConfig>;
export type InsertPlatformSettings = InsertModel<PlatformSettingsRecord>;
export type InsertNotificationPreferences = InsertModel<NotificationPreferences>;
export type InsertPriorityQueueSettings = InsertModel<PriorityQueueSettingsRecord>;
export type InsertRefreshSchedulingSettings = InsertModel<RefreshSchedulingSettings>;
export type InsertExportBackupConfig = InsertModel<ExportBackupConfig>;
export type InsertApiRateLimitSettings = InsertModel<ApiRateLimitSettings>;
export type InsertSettingsAuditLog = InsertModel<SettingsAuditLog>;
export type InsertIntelligenceSearch = InsertModel<IntelligenceSearch>;
export type InsertLogo = InsertModel<Logo>;

export const insertPromptSchema = z.object({
  text: z.string().min(1),
  topicId: z.number().int().nullable().optional(),
  topicIds: z.array(z.number().int()).optional(),
  archivedAt: z.date().nullable().optional(),
  journeyStages: z.array(z.string()).optional(),
  personaId: z.number().int().nullable().optional(),
  isPriority: z.boolean().optional(),
  lastRefreshedAt: z.date().nullable().optional(),
  refreshCount: z.number().int().optional(),
});

export const insertResponseSchema = z.object({
  promptId: z.number().int(),
  platform: z.string().optional(),
  text: z.string().min(1),
  brandMentioned: z.boolean().optional(),
  competitorsMentioned: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
});

export const insertAlertRuleSchema = z.object({
  name: z.string().min(1), type: z.string().min(1), threshold: z.number(),
  timeWindowHours: z.number().int().optional(), enabled: z.boolean().optional(), description: z.string().nullable().optional(),
});

export const insertAlertChannelSchema = z.object({
  name: z.string().min(1), type: z.string().min(1), config: z.record(z.string(), z.unknown()), enabled: z.boolean().optional(),
});

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type SubscriptionPlan = "free" | "pro" | "enterprise";
export type JourneyStage = "problem_aware" | "exploring" | "comparing_tradeoffs" | "deciding" | "onboarding" | "power_user";
export type PriorityLevel = "critical" | "high" | "normal" | "low";
export type VariableType = "text" | "list" | "number";
export type AliasType = "primary" | "abbreviation" | "misspelling" | "variation";
export type QualityLevelType = "good" | "acceptable" | "poor" | "excluded";
export type PeriodType = "hourly" | "daily" | "weekly" | "monthly";
export type AnomalyType = "score_drop" | "issue_spike" | "inclusion_drop";
export type AnomalySeverity = "low" | "medium" | "high" | "critical";
export type ExperimentStatus = "draft" | "running" | "paused" | "completed";
export type UsageReportType = "daily" | "weekly" | "monthly";
export type ThemeOption = "light" | "dark" | "system";
export type EmailFrequency = "immediate" | "daily" | "weekly" | "never";
export type ExportFormat = "json" | "csv" | "pdf";
export type QueueOrderingStrategy = "fifo" | "priority" | "staleness";
export type SettingsAction = "create" | "update" | "delete";
export type LogoSource = "logo_dev" | "clearbit" | "google_favicon";

export const ROLE_PERMISSIONS: Record<WorkspaceRole, string[]> = {
  owner: ["*"],
  admin: ["workspace:read", "workspace:update", "members:read", "members:invite", "members:remove", "data:read", "data:write"],
  member: ["workspace:read", "members:read", "data:read", "data:write"],
  viewer: ["workspace:read", "data:read"],
};

export type TopicPromptContext = Prompt & { topic: Topic | null };
export type PromptResponseContext = Response & { prompt: TopicPromptContext };

export interface TopicVisibilityMetric {
  topicId: Topic["id"];
  topicLabel: Topic["name"];
  promptCount: number;
  brandMentionedResponseCount: number;
  brandResponseMentionRate: number;
}

export interface CompetitorVisibilityMetric {
  competitorId: Competitor["id"];
  competitorName: Competitor["name"];
  category: Competitor["category"] | null;
  observedMentionCount: number;
  responseSharePercent: number;
  periodChangePercent: number;
}

export interface CitationSourceMetric {
  sourceId: Source["id"];
  sourceDomain: Source["domain"];
  observedCitationCount: number;
  citedUrls: string[];
}
