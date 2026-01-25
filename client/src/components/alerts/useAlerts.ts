/**
 * useAlerts - TanStack Query hooks for alerts management
 *
 * Provides hooks for:
 * - Fetching and managing alert rules
 * - Fetching and managing alert channels
 * - Fetching alert history
 * - Testing alerts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestWorkspaceApi, workspaceFetch as fetch } from '@/lib/workspace-query';
import type {
  AlertRule,
  AlertChannel,
  AlertHistoryEntry,
  CreateAlertRule,
  CreateAlertChannel,
} from './types';

// ===== Query Keys =====
export const alertKeys = {
  all: ['alerts'] as const,
  rules: () => [...alertKeys.all, 'rules'] as const,
  rule: (id: number) => [...alertKeys.rules(), id] as const,
  channels: () => [...alertKeys.all, 'channels'] as const,
  channel: (id: number) => [...alertKeys.channels(), id] as const,
  history: (params?: { limit?: number; ruleId?: number }) =>
    [...alertKeys.all, 'history', params] as const,
};

// ===== Rules Hooks =====

/** Fetch all alert rules */
export function useAlertRules() {
  return useQuery<AlertRule[]>({
    queryKey: alertKeys.rules(),
    queryFn: async () => {
      const res = await fetch('/api/alerts/rules', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch alert rules');
      return res.json();
    },
  });
}

/** Create a new alert rule */
export function useCreateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAlertRule) => {
      const res = await requestWorkspaceApi('POST', '/api/alerts/rules', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.rules() });
    },
  });
}

/** Update an alert rule */
export function useUpdateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateAlertRule> }) => {
      const res = await requestWorkspaceApi('PATCH', `/api/alerts/rules/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.rules() });
    },
  });
}

/** Delete an alert rule */
export function useDeleteAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await requestWorkspaceApi('DELETE', `/api/alerts/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.rules() });
    },
  });
}

/** Toggle alert rule enabled state */
export function useToggleAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const res = await requestWorkspaceApi('PATCH', `/api/alerts/rules/${id}`, { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.rules() });
    },
  });
}

// ===== Channels Hooks =====

/** Fetch all alert channels */
export function useAlertChannels() {
  return useQuery<AlertChannel[]>({
    queryKey: alertKeys.channels(),
    queryFn: async () => {
      const res = await fetch('/api/alerts/channels', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch alert channels');
      return res.json();
    },
  });
}

/** Create a new alert channel */
export function useCreateAlertChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAlertChannel) => {
      const res = await requestWorkspaceApi('POST', '/api/alerts/channels', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.channels() });
    },
  });
}

/** Update an alert channel */
export function useUpdateAlertChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateAlertChannel>;
    }) => {
      const res = await requestWorkspaceApi('PATCH', `/api/alerts/channels/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.channels() });
    },
  });
}

/** Delete an alert channel */
export function useDeleteAlertChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await requestWorkspaceApi('DELETE', `/api/alerts/channels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.channels() });
    },
  });
}

/** Toggle alert channel enabled state */
export function useToggleAlertChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const res = await requestWorkspaceApi('PATCH', `/api/alerts/channels/${id}`, { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.channels() });
    },
  });
}

// ===== History Hooks =====

/** Fetch alert history */
export function useAlertHistory(params?: { limit?: number; ruleId?: number }) {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.ruleId) queryParams.set('ruleId', params.ruleId.toString());
  const queryString = queryParams.toString();

  return useQuery<AlertHistoryEntry[]>({
    queryKey: alertKeys.history(params),
    queryFn: async () => {
      const url = queryString
        ? `/api/alerts/history?${queryString}`
        : '/api/alerts/history';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch alert history');
      return res.json();
    },
  });
}

/** Acknowledge an alert */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await requestWorkspaceApi('POST', `/api/alerts/history/${id}/acknowledge`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.history() });
    },
  });
}

// ===== Test Alert Hook =====

/** Send a test alert */
export function useTestAlert() {
  return useMutation({
    mutationFn: async (channelId?: number) => {
      const body = channelId ? { channelId } : {};
      const res = await requestWorkspaceApi('POST', '/api/alerts/test', body);
      return res.json();
    },
  });
}
