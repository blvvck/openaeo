/**
 * Bot Traffic Services Exports
 */

export {
  classifyBot,
  logBotVisit,
  logBotVisitsBatch,
  getBotStats,
  getAIBotStats,
  getBotTimeline,
  getRecentBotVisits,
  getVisitsForUrl,
  cleanupOldVisits,
  BOT_PATTERNS,
  type BotClassification,
  type BotStats,
  type TrafficSummary,
  type BotTimelineDay,
  type BotVisitMetadata,
} from './traffic-logger';
