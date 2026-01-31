import { workspaceFetch as fetch } from '@/lib/workspace-query';
/**
 * usePlatforms Hook
 *
 * Fetches the list of AI platforms from the backend.
 * Uses React Query with aggressive caching since platforms rarely change.
 *
 * Usage:
 *   const { platforms, isLoading, error, getPlatform, getPlatformColor } = usePlatforms();
 */

import { useQuery } from '@tanstack/react-query';
import type { Platform, PlatformsResponse } from '@shared/types/platforms';

// Fallback data in case the API fails - matches the backend source of truth
const FALLBACK_PLATFORMS: Platform[] = [
  { id: 'chatgpt', name: 'ChatGPT', color: '#10A37F' },
  { id: 'claude', name: 'Claude', color: '#E07A2F' },
  { id: 'gemini', name: 'Gemini', color: '#8B5CF6' },
  { id: 'grok', name: 'Grok', color: '#6B7280' },
  { id: 'deepseek', name: 'DeepSeek', color: '#3B82F6' },
  { id: 'perplexity', name: 'Perplexity', color: '#06B6D4' },
  { id: 'ai-mode', name: 'AI Mode', color: '#EC4899' },
  { id: 'ai-overview', name: 'AI Overview', color: '#F59E0B' },
];

async function fetchPlatforms(): Promise<Platform[]> {
  const response = await fetch('/api/platforms/list');
  if (!response.ok) {
    throw new Error('Failed to fetch platforms');
  }
  const data: PlatformsResponse = await response.json();
  return data.platforms;
}

export function usePlatforms() {
  const query = useQuery({
    queryKey: ['platforms', 'list'],
    queryFn: fetchPlatforms,
    // Platforms rarely change - cache aggressively
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
    // Use fallback data if API fails
    placeholderData: FALLBACK_PLATFORMS,
    retry: 1,
  });

  const platforms = query.data ?? FALLBACK_PLATFORMS;

  // Build a map for O(1) lookups
  const platformMap = new Map<string, Platform>(
    platforms.map(p => [p.id, p])
  );

  /**
   * Get platform info by ID
   * Returns fallback if platform not found
   */
  const getPlatform = (id: string): Platform => {
    const normalized = id.toLowerCase().replace(/_/g, '-');
    return platformMap.get(normalized) ?? {
      id: id as Platform['id'],
      name: id,
      color: '#6B7280',
    };
  };

  /**
   * Get platform color by ID
   */
  const getPlatformColor = (id: string): string => {
    return getPlatform(id).color;
  };

  /**
   * Get platform name by ID
   */
  const getPlatformName = (id: string): string => {
    return getPlatform(id).name;
  };

  return {
    platforms,
    isLoading: query.isLoading,
    error: query.error,
    getPlatform,
    getPlatformColor,
    getPlatformName,
    // For rare cases where you need to refetch
    refetch: query.refetch,
  };
}

export default usePlatforms;
