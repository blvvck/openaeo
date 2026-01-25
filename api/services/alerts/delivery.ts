/**
 * Alert Delivery Service
 *
 * Manages alert delivery channels (email, slack, webhook) and sends alerts.
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId, toPrismaData } from "../../prisma-mapping";
import type { AlertChannel, InsertAlertChannel } from "@shared/schema";
import type { RuleEvaluationResult } from './rules-engine';

/** Email channel configuration */
export interface EmailChannelConfig {
  recipients: string[];
  subject?: string;
}

/** Slack channel configuration */
export interface SlackChannelConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

/** Webhook channel configuration */
export interface WebhookChannelConfig {
  url: string;
  headers?: Record<string, string>;
  method?: 'POST' | 'PUT';
}

/** Channel configuration union type */
export type ChannelConfig = EmailChannelConfig | SlackChannelConfig | WebhookChannelConfig;

/** Delivery result */
export interface DeliveryResult {
  channelId: number;
  channelName: string;
  channelType: string;
  success: boolean;
  error?: string;
}

/** Alert delivery service class */
export class AlertDeliveryService {
  private static instance: AlertDeliveryService | null = null;

  static getInstance(): AlertDeliveryService {
    if (!AlertDeliveryService.instance) {
      AlertDeliveryService.instance = new AlertDeliveryService();
    }
    return AlertDeliveryService.instance;
  }

  /**
   * Create a new alert channel
   */
  async createChannel(channel: InsertAlertChannel): Promise<AlertChannel> {
    const created = await prisma.alert_channels.create({
      data: { ...toPrismaData(channel), workspace_id: requireWorkspaceId() } as any,
    });
    return fromPrismaRow<AlertChannel>(created as unknown as Record<string, unknown>);
  }

  /**
   * Get all alert channels
   */
  async getChannels(): Promise<AlertChannel[]> {
    const rows = await prisma.alert_channels.findMany({
      where: { workspace_id: requireWorkspaceId() },
      orderBy: { created_at: "desc" },
    });
    return rows.map((row) => fromPrismaRow<AlertChannel>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get enabled channels
   */
  async getEnabledChannels(): Promise<AlertChannel[]> {
    const rows = await prisma.alert_channels.findMany({
      where: { workspace_id: requireWorkspaceId(), enabled: true },
      orderBy: { created_at: "desc" },
    });
    return rows.map((row) => fromPrismaRow<AlertChannel>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get a channel by ID
   */
  async getChannelById(id: number): Promise<AlertChannel | undefined> {
    const channel = await prisma.alert_channels.findFirst({
      where: { id, workspace_id: requireWorkspaceId() },
    });
    return channel ? fromPrismaRow<AlertChannel>(channel as unknown as Record<string, unknown>) : undefined;
  }

  /**
   * Update a channel
   */
  async updateChannel(id: number, updates: Partial<InsertAlertChannel>): Promise<AlertChannel | undefined> {
    const result = await prisma.alert_channels.updateMany({
      where: { id, workspace_id: requireWorkspaceId() },
      data: { ...toPrismaData(updates), updated_at: new Date() } as any,
    });
    if (!result.count) return undefined;
    return this.getChannelById(id);
  }

  /**
   * Delete a channel
   */
  async deleteChannel(id: number): Promise<boolean> {
    const result = await prisma.alert_channels.deleteMany({
      where: { id, workspace_id: requireWorkspaceId() },
    });
    return result.count > 0;
  }

  /**
   * Toggle channel enabled status
   */
  async toggleChannel(id: number, enabled: boolean): Promise<AlertChannel | undefined> {
    return this.updateChannel(id, { enabled });
  }

  /**
   * Send an alert to all enabled channels
   */
  async sendAlert(result: RuleEvaluationResult): Promise<DeliveryResult[]> {
    const channels = await this.getEnabledChannels();
    const results: DeliveryResult[] = [];

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      const deliveryResult = await this.deliverToChannel(channel, result);
      results.push(deliveryResult);
    }

    return results;
  }

  /**
   * Send an alert to specific channels
   */
  async sendAlertToChannels(result: RuleEvaluationResult, channelIds: number[]): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (let i = 0; i < channelIds.length; i++) {
      const channel = await this.getChannelById(channelIds[i]);
      if (channel && channel.enabled) {
        const deliveryResult = await this.deliverToChannel(channel, result);
        results.push(deliveryResult);
      }
    }

    return results;
  }

  /**
   * Deliver alert to a specific channel
   */
  private async deliverToChannel(channel: AlertChannel, result: RuleEvaluationResult): Promise<DeliveryResult> {
    try {
      const channelType = channel.type as string;

      switch (channelType) {
        case 'email':
          await this.sendEmail(channel, result);
          break;
        case 'slack':
          await this.sendSlack(channel, result);
          break;
        case 'webhook':
          await this.sendWebhook(channel, result);
          break;
        default:
          throw new Error(`Unknown channel type: ${channel.type}`);
      }

      return {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        success: true,
      };
    } catch (error) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send email alert (placeholder - needs SMTP configuration)
   */
  private async sendEmail(channel: AlertChannel, result: RuleEvaluationResult): Promise<void> {
    const config = channel.config as unknown as EmailChannelConfig;
    void config;
    void result;
  }

  /**
   * Send Slack alert
   */
  private async sendSlack(channel: AlertChannel, result: RuleEvaluationResult): Promise<void> {
    const config = channel.config as unknown as SlackChannelConfig;

    if (!config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const payload = {
      channel: config.channel,
      username: config.username || 'OpenAEO Alerts',
      icon_emoji: config.iconEmoji || ':bell:',
      attachments: [
        {
          color: result.triggered ? '#ff0000' : '#00ff00',
          title: result.ruleName,
          text: result.message,
          fields: [
            {
              title: 'Current Value',
              value: result.currentValue.toFixed(2),
              short: true,
            },
            {
              title: 'Previous Value',
              value: result.previousValue.toFixed(2),
              short: true,
            },
            {
              title: 'Change',
              value: `${result.changePercent >= 0 ? '+' : ''}${result.changePercent.toFixed(1)}%`,
              short: true,
            },
            {
              title: 'Threshold',
              value: `${result.threshold}%`,
              short: true,
            },
          ],
          footer: 'OpenAEO',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Slack webhook failed: ${response.status} ${text}`);
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhook(channel: AlertChannel, result: RuleEvaluationResult): Promise<void> {
    const config = channel.config as unknown as WebhookChannelConfig;

    if (!config.url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert: {
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        ruleType: result.ruleType,
        triggered: result.triggered,
        message: result.message,
      },
      metrics: {
        currentValue: result.currentValue,
        previousValue: result.previousValue,
        change: result.change,
        changePercent: result.changePercent,
        threshold: result.threshold,
      },
      data: result.data,
      timestamp: new Date().toISOString(),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    };

    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Webhook failed: ${response.status} ${text}`);
    }
  }

  /**
   * Test a channel by sending a test alert
   */
  async testChannel(channelId: number): Promise<DeliveryResult> {
    const channel = await this.getChannelById(channelId);

    if (!channel) {
      return {
        channelId,
        channelName: 'Unknown',
        channelType: 'unknown',
        success: false,
        error: 'Channel not found',
      };
    }

    const testResult: RuleEvaluationResult = {
      ruleId: 0,
      ruleName: 'Test Alert',
      ruleType: 'visibility_drop',
      triggered: true,
      currentValue: 75,
      previousValue: 85,
      threshold: 10,
      change: -10,
      changePercent: -11.76,
      message: 'This is a test alert to verify channel configuration.',
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    };

    return this.deliverToChannel(channel, testResult);
  }

  /**
   * Update alert history status after delivery
   */
  async updateAlertHistoryStatus(
    historyId: number,
    status: 'sent' | 'failed',
    channelsSent?: number[],
    error?: string
  ): Promise<void> {
    await prisma.alert_history.updateMany({
      where: { id: historyId, workspace_id: requireWorkspaceId() },
      data: {
        status,
        sent_at: status === "sent" ? new Date() : null,
        error: error || null,
        ...(channelsSent ? { channels_sent: channelsSent as any } : {}),
      },
    });
  }
}

/** Singleton getter */
let deliveryService: AlertDeliveryService | null = null;

export function getAlertDeliveryService(): AlertDeliveryService {
  if (!deliveryService) {
    deliveryService = AlertDeliveryService.getInstance();
  }
  return deliveryService;
}
