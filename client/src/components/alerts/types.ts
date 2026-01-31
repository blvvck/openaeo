/**
 * Alert System Types
 *
 * Shared types for alert rules, channels, and history.
 */

/** Alert rule types based on what conditions can trigger alerts */
export type AlertRuleType =
  | 'visibility_drop'
  | 'visibility_rise'
  | 'mention_drop'
  | 'mention_rise'
  | 'competitor_surge'
  | 'sentiment_drop'
  | 'new_competitor'
  | 'position_loss';

/** Alert channel types for delivery */
export type AlertChannelType = 'email' | 'slack' | 'webhook';

/** Alert severity levels */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/** Alert rule configuration */
export interface AlertRule {
  id: number;
  name: string;
  type: AlertRuleType;
  threshold: number;
  enabled: boolean;
  severity: AlertSeverity;
  channels: number[];
  createdAt: string;
  updatedAt: string;
}

/** Alert channel configuration */
export interface AlertChannel {
  id: number;
  type: AlertChannelType;
  name: string;
  config: EmailConfig | SlackConfig | WebhookConfig;
  enabled: boolean;
  createdAt: string;
}

/** Email channel configuration */
export interface EmailConfig {
  email: string;
  includeDetails: boolean;
}

/** Slack channel configuration */
export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
}

/** Webhook channel configuration */
export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  includePayload: boolean;
}

/** Alert history entry */
export interface AlertHistoryEntry {
  id: number;
  ruleId: number;
  ruleName: string;
  type: AlertRuleType;
  severity: AlertSeverity;
  message: string;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  deliveredTo: Array<{
    channelId: number;
    channelName: string;
    success: boolean;
    error?: string;
  }>;
}

/** Create/update alert rule payload */
export interface CreateAlertRule {
  name: string;
  type: AlertRuleType;
  threshold: number;
  enabled?: boolean;
  severity?: AlertSeverity;
  channels?: number[];
}

/** Create/update alert channel payload */
export interface CreateAlertChannel {
  type: AlertChannelType;
  name: string;
  config: EmailConfig | SlackConfig | WebhookConfig;
  enabled?: boolean;
}

/** Alert rule type display info */
export const ALERT_RULE_TYPES: Record<
  AlertRuleType,
  { label: string; description: string; unit: string }
> = {
  visibility_drop: {
    label: 'Visibility Drop',
    description: 'Alert when visibility score decreases by threshold percent',
    unit: '%',
  },
  visibility_rise: {
    label: 'Visibility Rise',
    description: 'Alert when visibility score increases by threshold percent',
    unit: '%',
  },
  mention_drop: {
    label: 'Mention Drop',
    description: 'Alert when mention rate drops below threshold percent',
    unit: '%',
  },
  mention_rise: {
    label: 'Mention Rise',
    description: 'Alert when mention rate rises above threshold percent',
    unit: '%',
  },
  competitor_surge: {
    label: 'Competitor Surge',
    description: 'Alert when a competitor mention count increases by threshold percent',
    unit: '%',
  },
  sentiment_drop: {
    label: 'Sentiment Drop',
    description: 'Alert when sentiment score drops by threshold points',
    unit: 'pts',
  },
  new_competitor: {
    label: 'New Competitor',
    description: 'Alert when a new competitor is detected (threshold ignored)',
    unit: '',
  },
  position_loss: {
    label: 'Position Loss',
    description: 'Alert when average position drops by threshold places',
    unit: 'pos',
  },
};

/** Severity display info */
export const ALERT_SEVERITIES: Record<
  AlertSeverity,
  { label: string; color: string }
> = {
  info: { label: 'Info', color: 'text-blue-500' },
  warning: { label: 'Warning', color: 'text-yellow-500' },
  critical: { label: 'Critical', color: 'text-red-500' },
};

/** Channel type display info */
export const ALERT_CHANNEL_TYPES: Record<
  AlertChannelType,
  { label: string; description: string }
> = {
  email: { label: 'Email', description: 'Send alerts via email' },
  slack: { label: 'Slack', description: 'Post alerts to a Slack channel' },
  webhook: { label: 'Webhook', description: 'Send alerts to a custom URL' },
};
