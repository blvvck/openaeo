/**
 * useReports - TanStack Query hooks for reports management
 *
 * Provides hooks for:
 * - Generating PDF reports
 * - Creating shareable links
 * - Managing shared reports
 * - Fetching public report data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestWorkspaceApi, workspaceFetch as fetch } from '@/lib/workspace-query';
import type {
  GenerateReportRequest,
  GenerateReportResponse,
  SharedReport,
  CreateSharedReportRequest,
  PublicReportData,
} from './types';

// ===== Query Keys =====
export const reportKeys = {
  all: ['reports'] as const,
  shared: () => [...reportKeys.all, 'shared'] as const,
  sharedReport: (id: number) => [...reportKeys.shared(), id] as const,
  public: (publicId: string) => [...reportKeys.all, 'public', publicId] as const,
};

// ===== PDF Generation =====

/** Generate a PDF report */
export function useGenerateReport() {
  return useMutation({
    mutationFn: async (
      data: GenerateReportRequest
    ): Promise<GenerateReportResponse> => {
      const res = await requestWorkspaceApi('POST', '/api/export/pdf', data);
      return res.json();
    },
  });
}

/** Generate and download PDF report directly */
export function useDownloadReport() {
  return useMutation({
    mutationFn: async (data: GenerateReportRequest): Promise<void> => {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to generate report');
      }

      // Get the blob and trigger download
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let fileName = 'report.pdf';

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) fileName = match[1];
      }

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

// ===== Shared Reports =====

/** Fetch all shared reports */
export function useSharedReports() {
  return useQuery<SharedReport[]>({
    queryKey: reportKeys.shared(),
    queryFn: async () => {
      const res = await fetch('/api/reports/shared', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch shared reports');
      return res.json();
    },
  });
}

/** Create a shareable report link */
export function useCreateSharedReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateSharedReportRequest
    ): Promise<SharedReport> => {
      const res = await requestWorkspaceApi('POST', '/api/reports/share', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.shared() });
    },
  });
}

/** Revoke a shared report */
export function useRevokeSharedReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await requestWorkspaceApi('DELETE', `/api/reports/shared/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.shared() });
    },
  });
}

// ===== Public Reports =====

/** Fetch public report data (for viewing shared reports) */
export function usePublicReport(publicId: string, enabled = true) {
  return useQuery<PublicReportData>({
    queryKey: reportKeys.public(publicId),
    queryFn: async () => {
      const res = await fetch(`/api/export/public/${publicId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Report not found');
        if (res.status === 410) throw new Error('Report has expired');
        throw new Error('Failed to load report');
      }
      return res.json();
    },
    enabled: enabled && !!publicId,
    // Public reports can be cached longer
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ===== Utility Hooks =====

/** Copy share link to clipboard */
export function useCopyShareLink() {
  return useMutation({
    mutationFn: async (publicUrl: string): Promise<void> => {
      await navigator.clipboard.writeText(publicUrl);
    },
  });
}
