

import { prisma } from '../../prisma';
import type { Platform, InsertPlatform } from '@shared/schema';

function mapPlatform(row: Record<string, unknown>): Platform {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as Platform;
}

/**
 * Platform types supported by the system
 */
export type PlatformType = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok' | 'deepseek' | 'google-ai-overview' | 'google-ai-mode' | 'custom';

/**
 * Platform status for operational monitoring
 */
export type PlatformStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Extended platform configuration
 */
export interface PlatformConfig {
  /** API endpoint URL */
  apiEndpoint?: string;
  /** Model to use for this platform */
  model?: string;
  /** Custom headers for API requests */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
  /** Whether to use streaming responses */
  useStreaming?: boolean;
  /** Custom configuration options */
  custom?: Record<string, unknown>;
}

/**
 * Platform with computed/extended fields
 */
export interface PlatformWithStatus extends Platform {
  status?: PlatformStatus;
  config?: PlatformConfig;
  type?: PlatformType;
}

/**
 * Input for creating a new platform
 */
export interface CreatePlatformInput {
  slug: string;
  name: string;
  iconUrl?: string | null;
  isActive?: boolean;
  rateLimitRpm: number;
  rateLimitConcurrent: number;
  type?: PlatformType;
  config?: PlatformConfig;
}

/**
 * Input for updating a platform
 */
export interface UpdatePlatformInput {
  name?: string;
  iconUrl?: string | null;
  isActive?: boolean;
  rateLimitRpm?: number;
  rateLimitConcurrent?: number;
  type?: PlatformType;
  config?: PlatformConfig;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

class PlatformService {
  private static instance: PlatformService | null = null;

  static getInstance(): PlatformService {
    if (!PlatformService.instance) {
      PlatformService.instance = new PlatformService();
    }
    return PlatformService.instance;
  }

  /**
   * Get all platforms
   */
  async getAll(): Promise<Platform[]> {
    return (await prisma.platforms.findMany({ orderBy: { created_at: 'asc' } })).map(mapPlatform);
  }

  /**
   * Get active platforms only
   */
  async getActive(): Promise<Platform[]> {
    return (await prisma.platforms.findMany({ where: { is_active: true }, orderBy: { created_at: 'asc' } })).map(mapPlatform);
  }

  /**
   * Get platform by ID
   */
  async getById(id: string): Promise<Platform | undefined> {
    const platform = await prisma.platforms.findUnique({ where: { id } });
    return platform ? mapPlatform(platform) : undefined;
  }

  /**
   * Get platform by slug
   */
  async getBySlug(slug: string): Promise<Platform | undefined> {
    const platform = await prisma.platforms.findUnique({ where: { slug } });
    return platform ? mapPlatform(platform) : undefined;
  }

  /**
   * Create a new platform
   */
  async create(input: CreatePlatformInput): Promise<Platform> {
    const validation = this.validateCreateInput(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check for duplicate slug
    const existing = await this.getBySlug(input.slug);
    if (existing) {
      throw new Error(`Platform with slug "${input.slug}" already exists`);
    }

    const created = await prisma.platforms.create({
      data: {
        slug: input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        name: input.name,
        icon_url: input.iconUrl,
        is_active: input.isActive ?? true,
        rate_limit_rpm: input.rateLimitRpm,
        rate_limit_concurrent: input.rateLimitConcurrent,
      },
    });

    return mapPlatform(created);
  }

  /**
   * Update an existing platform
   */
  async update(id: string, input: UpdatePlatformInput): Promise<Platform | undefined> {
    const validation = this.validateUpdateInput(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const existing = await this.getById(id);
    if (!existing) {
      return undefined;
    }

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.iconUrl !== undefined) updateData.icon_url = input.iconUrl;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.rateLimitRpm !== undefined) updateData.rate_limit_rpm = input.rateLimitRpm;
    if (input.rateLimitConcurrent !== undefined) updateData.rate_limit_concurrent = input.rateLimitConcurrent;

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    const updated = await prisma.platforms.update({ where: { id }, data: updateData as any });

    return mapPlatform(updated);
  }

  /**
   * Delete a platform
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      return false;
    }

    const result = await prisma.platforms.deleteMany({ where: { id } });

    return result.count > 0;
  }

  /**
   * Toggle platform active status
   */
  async toggleActive(id: string): Promise<Platform | undefined> {
    const existing = await this.getById(id);
    if (!existing) {
      return undefined;
    }

    const updated = await prisma.platforms.update({ where: { id }, data: { is_active: !existing.isActive } });

    return mapPlatform(updated);
  }

  /**
   * Update rate limits for a platform
   */
  async updateRateLimits(id: string, rpm: number, concurrent: number): Promise<Platform | undefined> {
    if (rpm < 1 || rpm > 10000) {
      throw new Error('RPM must be between 1 and 10000');
    }
    if (concurrent < 1 || concurrent > 100) {
      throw new Error('Concurrent limit must be between 1 and 100');
    }

    const existing = await this.getById(id);
    if (!existing) {
      return undefined;
    }

    const updated = await prisma.platforms.update({
      where: { id },
      data: { rate_limit_rpm: rpm, rate_limit_concurrent: concurrent },
    });

    return mapPlatform(updated);
  }

  /**
   * Get platform statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  }> {
    const all = await this.getAll();
    const active = all.filter(p => p.isActive);

    // Count by slug prefix (approximate type)
    const byType: Record<string, number> = {};
    for (const p of all) {
      const type = this.inferType(p.slug);
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
      byType,
    };
  }

  /**
   * Infer platform type from slug
   */
  private inferType(slug: string): PlatformType {
    const lowerSlug = slug.toLowerCase();
    if (lowerSlug.includes('chatgpt') || lowerSlug.includes('openai')) return 'chatgpt';
    if (lowerSlug.includes('claude') || lowerSlug.includes('anthropic')) return 'claude';
    if (lowerSlug.includes('gemini')) return 'gemini';
    if (lowerSlug.includes('perplexity')) return 'perplexity';
    if (lowerSlug.includes('grok')) return 'grok';
    if (lowerSlug.includes('deepseek')) return 'deepseek';
    if (lowerSlug.includes('google-ai-overview')) return 'google-ai-overview';
    if (lowerSlug.includes('google-ai-mode')) return 'google-ai-mode';
    return 'custom';
  }

  /**
   * Validate create input
   */
  private validateCreateInput(input: CreatePlatformInput): ValidationResult {
    const errors: string[] = [];

    if (!input.slug || input.slug.trim().length === 0) {
      errors.push('Slug is required');
    } else if (input.slug.length > 50) {
      errors.push('Slug must be 50 characters or less');
    } else if (!/^[a-zA-Z0-9-]+$/.test(input.slug)) {
      errors.push('Slug can only contain letters, numbers, and hyphens');
    }

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (input.name.length > 100) {
      errors.push('Name must be 100 characters or less');
    }

    if (input.rateLimitRpm === undefined || input.rateLimitRpm < 1 || input.rateLimitRpm > 10000) {
      errors.push('RPM must be between 1 and 10000');
    }

    if (input.rateLimitConcurrent === undefined || input.rateLimitConcurrent < 1 || input.rateLimitConcurrent > 100) {
      errors.push('Concurrent limit must be between 1 and 100');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate update input
   */
  private validateUpdateInput(input: UpdatePlatformInput): ValidationResult {
    const errors: string[] = [];

    if (input.name !== undefined && (input.name.trim().length === 0 || input.name.length > 100)) {
      errors.push('Name must be between 1 and 100 characters');
    }

    if (input.rateLimitRpm !== undefined && (input.rateLimitRpm < 1 || input.rateLimitRpm > 10000)) {
      errors.push('RPM must be between 1 and 10000');
    }

    if (input.rateLimitConcurrent !== undefined && (input.rateLimitConcurrent < 1 || input.rateLimitConcurrent > 100)) {
      errors.push('Concurrent limit must be between 1 and 100');
    }

    return { valid: errors.length === 0, errors };
  }
}

// Singleton getter
let service: PlatformService | null = null;

export function getPlatformService(): PlatformService {
  if (!service) {
    service = PlatformService.getInstance();
  }
  return service;
}

// Reset for testing
export function resetPlatformService(): void {
  service = null;
  (PlatformService as any).instance = null;
}

export { PlatformService };
