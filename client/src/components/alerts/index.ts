/**
 * Alert Components
 *
 * UI components for managing and viewing alert rules, channels, and history.
 */

// Main components
export { AlertRulesList, AlertRulesCompact } from './AlertRulesList';
export { AlertRuleForm } from './AlertRuleForm';
export { AlertChannelConfig } from './AlertChannelConfig';
export { AlertHistory, AlertHistoryCompact } from './AlertHistory';
export { TestAlertButton, TestChannelButton } from './TestAlertButton';

// Hooks
export {
  alertKeys,
  useAlertRules,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
  useToggleAlertRule,
  useAlertChannels,
  useCreateAlertChannel,
  useUpdateAlertChannel,
  useDeleteAlertChannel,
  useToggleAlertChannel,
  useAlertHistory,
  useAcknowledgeAlert,
  useTestAlert,
} from './useAlerts';

// Types
export type {
  AlertRuleType,
  AlertChannelType,
  AlertSeverity,
  AlertRule,
  AlertChannel,
  AlertHistoryEntry,
  CreateAlertRule,
  CreateAlertChannel,
  EmailConfig,
  SlackConfig,
  WebhookConfig,
} from './types';

// Constants
export {
  ALERT_RULE_TYPES,
  ALERT_SEVERITIES,
  ALERT_CHANNEL_TYPES,
} from './types';
