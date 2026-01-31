/**
 * Alert Rules Engine
 *
 * Evaluates alert rules and triggers alerts when conditions are met.
 * Supports:
 * - Visibility drop detection (>10%)
 * - Brand removal detection
 * - Competitor surge detection (>20%)
 * - Sentiment shift detection
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId, toPrismaData } from "../../prisma-mapping";
import type { AlertHistory, AlertRule, InsertAlertRule, InsertAlertHistory } from "@shared/schema";
import { getSimpleSentiment } from '../analytics/sentiment-analyzer';
import { storage } from '../../data';

/** Alert rule types */
export type AlertRuleType = 'visibility_drop' | 'brand_removal' | 'competitor_surge' | 'sentiment_shift';

/** Evaluation result for a single rule */
export interface RuleEvaluationResult {
  ruleId: number;
  ruleName: string;
  ruleType: AlertRuleType;
  triggered: boolean;
  currentValue: number;
  previousValue: number;
  threshold: number;
  change: number;
  changePercent: number;
  message: string;
  data: Record<string, unknown>;
}

/** Alert rules engine class */
export class AlertRulesEngine {
  private static instance: AlertRulesEngine | null = null;

  static getInstance(): AlertRulesEngine {
    if (!AlertRulesEngine.instance) {
      AlertRulesEngine.instance = new AlertRulesEngine();
    }
    return AlertRulesEngine.instance;
  }

  /**
   * Create a new alert rule
   */
  async createRule(rule: InsertAlertRule): Promise<AlertRule> {
    const created = await prisma.alert_rules.create({
      data: { ...toPrismaData(rule), workspace_id: requireWorkspaceId() } as any,
    });
    return fromPrismaRow<AlertRule>(created as unknown as Record<string, unknown>);
  }

  /**
   * Get all alert rules
   */
  async getRules(): Promise<AlertRule[]> {
    const rows = await prisma.alert_rules.findMany({
      where: { workspace_id: requireWorkspaceId() }, orderBy: { created_at: "desc" },
    });
    return rows.map((row) => fromPrismaRow<AlertRule>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get enabled rules by type
   */
  async getEnabledRulesByType(type: AlertRuleType): Promise<AlertRule[]> {
    const rows = await prisma.alert_rules.findMany({
      where: { workspace_id: requireWorkspaceId(), type, enabled: true },
    });
    return rows.map((row) => fromPrismaRow<AlertRule>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get a rule by ID
   */
  async getRuleById(id: number): Promise<AlertRule | undefined> {
    const rule = await prisma.alert_rules.findFirst({ where: { id, workspace_id: requireWorkspaceId() } });
    return rule ? fromPrismaRow<AlertRule>(rule as unknown as Record<string, unknown>) : undefined;
  }

  /**
   * Update a rule
   */
  async updateRule(id: number, updates: Partial<InsertAlertRule>): Promise<AlertRule | undefined> {
    const result = await prisma.alert_rules.updateMany({
      where: { id, workspace_id: requireWorkspaceId() },
      data: { ...toPrismaData(updates), updated_at: new Date() } as any,
    });
    return result.count ? this.getRuleById(id) : undefined;
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: number): Promise<boolean> {
    const result = await prisma.alert_rules.deleteMany({ where: { id, workspace_id: requireWorkspaceId() } });
    return result.count > 0;
  }

  /**
   * Toggle rule enabled status
   */
  async toggleRule(id: number, enabled: boolean): Promise<AlertRule | undefined> {
    return this.updateRule(id, { enabled });
  }

  /**
   * Evaluate all enabled rules and return results
   */
  async evaluateAllRules(): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    const enabledRules = (await prisma.alert_rules.findMany({
      where: { workspace_id: requireWorkspaceId(), enabled: true },
    })).map((row) => fromPrismaRow<AlertRule>(row as unknown as Record<string, unknown>));

    for (let i = 0; i < enabledRules.length; i++) {
      const rule = enabledRules[i];
      try {
        const result = await this.evaluateRule(rule);
        results.push(result);
      } catch (error) {
        console.error(`[AlertRulesEngine] Error evaluating rule ${rule.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule
   */
  async evaluateRule(rule: AlertRule): Promise<RuleEvaluationResult> {
    const ruleType = rule.type as AlertRuleType;

    switch (ruleType) {
      case 'visibility_drop':
        return this.evaluateVisibilityDrop(rule);
      case 'brand_removal':
        return this.evaluateBrandRemoval(rule);
      case 'competitor_surge':
        return this.evaluateCompetitorSurge(rule);
      case 'sentiment_shift':
        return this.evaluateSentimentShift(rule);
      default:
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: ruleType,
          triggered: false,
          currentValue: 0,
          previousValue: 0,
          threshold: rule.threshold,
          change: 0,
          changePercent: 0,
          message: `Unknown rule type: ${rule.type}`,
          data: {},
        };
    }
  }

  /**
   * Evaluate visibility drop rule
   * Triggers when visibility score drops by more than threshold %
   */
  private async evaluateVisibilityDrop(rule: AlertRule): Promise<RuleEvaluationResult> {
    const responses = await storage.getResponses();

    // Get current and previous visibility scores
    // For now, we'll use a simplified calculation
    const now = new Date();
    const windowMs = (rule.timeWindowHours || 24) * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - windowMs);
    const prevCutoff = new Date(cutoff.getTime() - windowMs);

    // Filter responses by time window
    const currentResponses = responses.filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
    const prevResponses = responses.filter(r => r.createdAt && new Date(r.createdAt) >= prevCutoff && new Date(r.createdAt) < cutoff);

    // Calculate visibility scores (mention rate as proxy)
    const currentMentions = currentResponses.filter(r => r.brandMentioned).length;
    const currentTotal = currentResponses.length;
    const prevMentions = prevResponses.filter(r => r.brandMentioned).length;
    const prevTotal = prevResponses.length;

    const currentVisibility = currentTotal > 0 ? (currentMentions / currentTotal) * 100 : 0;
    const prevVisibility = prevTotal > 0 ? (prevMentions / prevTotal) * 100 : 0;

    const change = currentVisibility - prevVisibility;
    const changePercent = prevVisibility > 0 ? (change / prevVisibility) * 100 : 0;
    const triggered = changePercent < -rule.threshold;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: 'visibility_drop',
      triggered,
      currentValue: currentVisibility,
      previousValue: prevVisibility,
      threshold: rule.threshold,
      change,
      changePercent,
      message: triggered
        ? `Visibility dropped by ${Math.abs(changePercent).toFixed(1)}% (threshold: ${rule.threshold}%)`
        : `Visibility change: ${changePercent.toFixed(1)}% (threshold: -${rule.threshold}%)`,
      data: {
        currentResponses: currentTotal,
        currentMentions,
        previousResponses: prevTotal,
        prevMentions,
        timeWindowHours: rule.timeWindowHours,
      },
    };
  }

  /**
   * Evaluate brand removal rule
   * Triggers when brand is not mentioned in recent responses
   */
  private async evaluateBrandRemoval(rule: AlertRule): Promise<RuleEvaluationResult> {
    const responses = await storage.getResponses();

    const now = new Date();
    const windowMs = (rule.timeWindowHours || 24) * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - windowMs);

    // Filter recent responses
    const recentResponses = responses.filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
    const mentionCount = recentResponses.filter(r => r.brandMentioned).length;
    const totalCount = recentResponses.length;

    // Rule: brand not mentioned in threshold consecutive responses
    const nonMentionRate = totalCount > 0 ? ((totalCount - mentionCount) / totalCount) * 100 : 0;
    const triggered = totalCount >= rule.threshold && mentionCount === 0;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: 'brand_removal',
      triggered,
      currentValue: mentionCount,
      previousValue: totalCount,
      threshold: rule.threshold,
      change: 0,
      changePercent: nonMentionRate,
      message: triggered
        ? `Brand not mentioned in ${totalCount} recent responses`
        : `Brand mentioned ${mentionCount}/${totalCount} times recently`,
      data: {
        recentResponseCount: totalCount,
        brandMentionCount: mentionCount,
        nonMentionRate,
        timeWindowHours: rule.timeWindowHours,
      },
    };
  }

  /**
   * Evaluate competitor surge rule
   * Triggers when competitor mentions increase by more than threshold %
   */
  private async evaluateCompetitorSurge(rule: AlertRule): Promise<RuleEvaluationResult> {
    const responses = await storage.getResponses();
    const competitors = await storage.getCompetitors();

    const now = new Date();
    const windowMs = (rule.timeWindowHours || 24) * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - windowMs);
    const prevCutoff = new Date(cutoff.getTime() - windowMs);

    // Filter responses by time window
    const currentResponses = responses.filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
    const prevResponses = responses.filter(r => r.createdAt && new Date(r.createdAt) >= prevCutoff && new Date(r.createdAt) < cutoff);

    // Count competitor mentions
    const countCompetitorMentions = (resps: typeof responses): number => {
      let count = 0;
      for (let i = 0; i < resps.length; i++) {
        const r = resps[i];
        if (r.competitorsMentioned && Array.isArray(r.competitorsMentioned)) {
          count += r.competitorsMentioned.length;
        }
      }
      return count;
    };

    const currentMentions = countCompetitorMentions(currentResponses);
    const prevMentions = countCompetitorMentions(prevResponses);

    const change = currentMentions - prevMentions;
    const changePercent = prevMentions > 0 ? (change / prevMentions) * 100 : (currentMentions > 0 ? 100 : 0);
    const triggered = changePercent > rule.threshold;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: 'competitor_surge',
      triggered,
      currentValue: currentMentions,
      previousValue: prevMentions,
      threshold: rule.threshold,
      change,
      changePercent,
      message: triggered
        ? `Competitor mentions surged by ${changePercent.toFixed(1)}% (threshold: ${rule.threshold}%)`
        : `Competitor mentions change: ${changePercent.toFixed(1)}% (threshold: ${rule.threshold}%)`,
      data: {
        currentMentions,
        prevMentions,
        competitorCount: competitors.length,
        timeWindowHours: rule.timeWindowHours,
      },
    };
  }

  /**
   * Evaluate sentiment shift rule
   * Triggers when average sentiment changes significantly
   */
  private async evaluateSentimentShift(rule: AlertRule): Promise<RuleEvaluationResult> {
    const responses = await storage.getResponses();

    const now = new Date();
    const windowMs = (rule.timeWindowHours || 24) * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - windowMs);
    const prevCutoff = new Date(cutoff.getTime() - windowMs);

    // Filter responses by time window
    const currentResponses = responses.filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
    const prevResponses = responses.filter(r => r.createdAt && new Date(r.createdAt) >= prevCutoff && new Date(r.createdAt) < cutoff);

    // Calculate average sentiment
    const calcAvgSentiment = (resps: typeof responses): number => {
      if (resps.length === 0) return 0;
      let total = 0;
      for (let i = 0; i < resps.length; i++) {
        const result = getSimpleSentiment(resps[i].text);
        total += result.score;
      }
      return total / resps.length;
    };

    const currentSentiment = calcAvgSentiment(currentResponses);
    const prevSentiment = calcAvgSentiment(prevResponses);

    const change = currentSentiment - prevSentiment;
    // Sentiment is -1 to 1, so we use absolute change for threshold
    const changePercent = Math.abs(change) * 100;
    const triggered = Math.abs(change) > (rule.threshold / 100);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: 'sentiment_shift',
      triggered,
      currentValue: currentSentiment,
      previousValue: prevSentiment,
      threshold: rule.threshold,
      change,
      changePercent,
      message: triggered
        ? `Sentiment shifted by ${(change * 100).toFixed(1)} points (threshold: ${rule.threshold}%)`
        : `Sentiment change: ${(change * 100).toFixed(1)} points (threshold: ${rule.threshold}%)`,
      data: {
        currentSentiment,
        previousSentiment: prevSentiment,
        currentResponseCount: currentResponses.length,
        previousResponseCount: prevResponses.length,
        timeWindowHours: rule.timeWindowHours,
      },
    };
  }

  /**
   * Log an alert to history
   */
  async logAlert(result: RuleEvaluationResult, channelsSent?: number[]): Promise<void> {
    const historyEntry: InsertAlertHistory = {
      ruleId: result.ruleId,
      status: channelsSent ? 'sent' : 'pending',
      message: result.message,
      data: result.data,
      channelsSent: channelsSent || null,
      sentAt: channelsSent ? new Date() : null,
    };

    await prisma.alert_history.create({
      data: { ...toPrismaData(historyEntry), workspace_id: requireWorkspaceId() } as any,
    });
  }

  /**
   * Get alert history
   */
  async getAlertHistory(limit: number = 50): Promise<AlertHistory[]> {
    const rows = await prisma.alert_history.findMany({
      where: { workspace_id: requireWorkspaceId() }, orderBy: { triggered_at: "desc" }, take: limit,
    });
    return rows.map((row) => fromPrismaRow<AlertHistory>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get alert history for a specific rule
   */
  async getAlertHistoryByRule(ruleId: number, limit: number = 20): Promise<AlertHistory[]> {
    const rows = await prisma.alert_history.findMany({
      where: { workspace_id: requireWorkspaceId(), rule_id: ruleId }, orderBy: { triggered_at: "desc" }, take: limit,
    });
    return rows.map((row) => fromPrismaRow<AlertHistory>(row as unknown as Record<string, unknown>));
  }

  /**
   * Run rule evaluation and log triggered alerts
   */
  async runEvaluation(): Promise<RuleEvaluationResult[]> {
    const results = await this.evaluateAllRules();

    // Log triggered alerts
    const triggered = results.filter(r => r.triggered);
    for (let i = 0; i < triggered.length; i++) {
      await this.logAlert(triggered[i]);
    }

    return results;
  }
}

/** Singleton getter */
let rulesEngine: AlertRulesEngine | null = null;

export function getAlertRulesEngine(): AlertRulesEngine {
  if (!rulesEngine) {
    rulesEngine = AlertRulesEngine.getInstance();
  }
  return rulesEngine;
}
