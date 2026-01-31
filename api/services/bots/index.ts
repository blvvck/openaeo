/**
 * Bot Traffic Services Exports
 */

export {
  classifyBot,
  logBotVisit,
  logBotVisitsBatch,
  getBotStats,
  getAIBotStats,
  getRecentBotVisits,
  getVisitsForUrl,
  cleanupOldVisits,
  BOT_PATTERNS,
  type BotClassification,
  type BotStats,
  type TrafficSummary,
  type BotVisitMetadata,
} from './traffic-logger';
