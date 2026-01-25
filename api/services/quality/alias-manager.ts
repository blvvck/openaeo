/**
 * Brand Alias Manager Service
 *
 * S086: Handles CRUD operations for brand aliases
 * S087: Provides alias matching in response analysis
 *
 * Supports:
 * - Storing alternate names, misspellings, abbreviations
 * - Normalized matching (lowercase, trim, etc.)
 * - Efficient alias lookup
 */

import { prisma } from '../../prisma';
import { currentWorkspaceId } from '../../context/workspace-context';
import type {
  BrandAlias,
  InsertBrandAlias,
  AliasType,
} from '@shared/schema';

function workspaceId(): string {
  const id = currentWorkspaceId();
  if (!id) throw new Error('Workspace context is required for data access');
  return id;
}

function mapAlias(row: Record<string, unknown>): BrandAlias {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as BrandAlias;
}

/** Match result from alias lookup */
export interface AliasMatch {
  /** Matched alias text */
  alias: string;
  /** The original text that matched */
  matchedText: string;
  /** Type of alias */
  aliasType: AliasType;
  /** Start position in source text */
  startIndex: number;
  /** End position in source text */
  endIndex: number;
  /** Match confidence (0-1) */
  confidence: number;
  /** Whether this was a partial match */
  isPartialMatch: boolean;
}

/** Brand alias configuration for detection */
export interface BrandAliasConfig {
  brandId: string;
  aliases: BrandAlias[];
}

/**
 * Normalize alias text for consistent matching
 */
export function normalizeAlias(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .replace(/[^\w\s-]/g, '');     // Remove special chars except hyphen
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Brand Alias Manager Class
 */
export class AliasManager {
  private static instance: AliasManager | null = null;
  private aliasCache: Map<string, BrandAlias[]> = new Map();
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  static getInstance(): AliasManager {
    if (!AliasManager.instance) {
      AliasManager.instance = new AliasManager();
    }
    return AliasManager.instance;
  }

  /**
   * Clear the alias cache
   */
  clearCache(): void {
    this.aliasCache.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.cacheTTL;
  }

  // ==================== CRUD Operations (S086) ====================

  /**
   * Create a new brand alias
   */
  async createAlias(data: Omit<InsertBrandAlias, 'normalizedAlias'>): Promise<BrandAlias> {
    const normalizedAlias = normalizeAlias(data.alias);

    const created = await prisma.brand_aliases.create({
      data: {
        workspace_id: workspaceId(),
        brand_id: data.brandId,
        alias: data.alias,
        normalized_alias: normalizedAlias,
        alias_type: data.aliasType,
        match_partial: data.matchPartial,
        is_primary: data.isPrimary,
        confidence: data.confidence,
      },
    });
    this.clearCache();
    return mapAlias(created);
  }

  /**
   * Create multiple aliases at once
   */
  async createAliases(aliases: Array<Omit<InsertBrandAlias, 'normalizedAlias'>>): Promise<BrandAlias[]> {
    if (aliases.length === 0) return [];

    const workspace_id = workspaceId();
    const created = await prisma.$transaction(aliases.map((data) => prisma.brand_aliases.create({
      data: {
        workspace_id,
        brand_id: data.brandId,
        alias: data.alias,
        normalized_alias: normalizeAlias(data.alias),
        alias_type: data.aliasType,
        match_partial: data.matchPartial,
        is_primary: data.isPrimary,
        confidence: data.confidence,
      },
    })));
    this.clearCache();
    return created.map(mapAlias);
  }

  /**
   * Get all aliases for a brand
   */
  async getAliasesByBrand(brandId: string): Promise<BrandAlias[]> {
    // Check cache
    const cacheKey = `${workspaceId()}:${brandId}`;
    if (this.isCacheValid() && this.aliasCache.has(cacheKey)) {
      return this.aliasCache.get(cacheKey) || [];
    }

    const aliases = (await prisma.brand_aliases.findMany({
      where: { workspace_id: workspaceId(), brand_id: brandId, deleted_at: null },
      orderBy: [{ is_primary: 'desc' }, { alias: 'asc' }],
    })).map(mapAlias);

    this.aliasCache.set(cacheKey, aliases);
    this.cacheTimestamp = Date.now();
    return aliases;
  }

  /**
   * Get all active aliases
   */
  async getAllAliases(): Promise<BrandAlias[]> {
    return (await prisma.brand_aliases.findMany({
      where: { workspace_id: workspaceId(), deleted_at: null },
      orderBy: [{ brand_id: 'asc' }, { is_primary: 'desc' }],
    })).map(mapAlias);
  }

  /**
   * Get alias by ID
   */
  async getAliasById(id: number): Promise<BrandAlias | undefined> {
    const alias = await prisma.brand_aliases.findFirst({ where: { id, workspace_id: workspaceId() } });
    return alias ? mapAlias(alias) : undefined;
  }

  /**
   * Update an alias
   */
  async updateAlias(
    id: number,
    updates: Partial<Omit<InsertBrandAlias, 'normalizedAlias'>>
  ): Promise<BrandAlias | undefined> {
    const updated = await prisma.brand_aliases.updateMany({
      where: { id, workspace_id: workspaceId() },
      data: {
        ...(updates.brandId !== undefined ? { brand_id: updates.brandId } : {}),
        ...(updates.alias !== undefined ? { alias: updates.alias, normalized_alias: normalizeAlias(updates.alias) } : {}),
        ...(updates.aliasType !== undefined ? { alias_type: updates.aliasType } : {}),
        ...(updates.matchPartial !== undefined ? { match_partial: updates.matchPartial } : {}),
        ...(updates.isPrimary !== undefined ? { is_primary: updates.isPrimary } : {}),
        ...(updates.confidence !== undefined ? { confidence: updates.confidence } : {}),
        updated_at: new Date(),
      },
    });

    this.clearCache();
    return updated.count ? this.getAliasById(id) : undefined;
  }

  /**
   * Soft delete an alias
   */
  async deleteAlias(id: number): Promise<boolean> {
    const result = await prisma.brand_aliases.updateMany({
      where: { id, workspace_id: workspaceId() },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    this.clearCache();
    return result.count > 0;
  }

  /**
   * Hard delete an alias (permanently remove)
   */
  async hardDeleteAlias(id: number): Promise<boolean> {
    const result = await prisma.brand_aliases.deleteMany({ where: { id, workspace_id: workspaceId() } });
    this.clearCache();
    return result.count > 0;
  }

  /**
   * Restore a soft-deleted alias
   */
  async restoreAlias(id: number): Promise<BrandAlias | undefined> {
    const result = await prisma.brand_aliases.updateMany({
      where: { id, workspace_id: workspaceId() },
      data: { deleted_at: null, updated_at: new Date() },
    });

    this.clearCache();
    return result.count ? this.getAliasById(id) : undefined;
  }

  /**
   * Check if an alias already exists for a brand
   */
  async aliasExists(brandId: string, alias: string): Promise<boolean> {
    const normalized = normalizeAlias(alias);
    return (await prisma.brand_aliases.count({
      where: { workspace_id: workspaceId(), brand_id: brandId, normalized_alias: normalized, deleted_at: null },
    })) > 0;
  }

  // ==================== Alias Matching (S087) ====================

  /**
   * Find all brand mentions in text using aliases
   */
  async findBrandMentions(text: string, brandId: string): Promise<AliasMatch[]> {
    const aliases = await this.getAliasesByBrand(brandId);
    return this.findMentionsWithAliases(text, aliases);
  }

  /**
   * Find mentions using a pre-loaded alias list
   */
  findMentionsWithAliases(text: string, aliases: BrandAlias[]): AliasMatch[] {
    const matches: AliasMatch[] = [];
    const lowerText = text.toLowerCase();

    for (const alias of aliases) {
      const searchTerm = alias.normalizedAlias;

      if (alias.matchPartial) {
        // Find all partial occurrences
        let index = 0;
        while ((index = lowerText.indexOf(searchTerm, index)) !== -1) {
          matches.push({
            alias: alias.alias,
            matchedText: text.slice(index, index + searchTerm.length),
            aliasType: alias.aliasType as AliasType,
            startIndex: index,
            endIndex: index + searchTerm.length,
            confidence: alias.confidence || 1.0,
            isPartialMatch: true,
          });
          index += searchTerm.length;
        }
      } else {
        // Word boundary matching
        const regex = new RegExp(`\\b${escapeRegex(searchTerm)}\\b`, 'gi');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
          matches.push({
            alias: alias.alias,
            matchedText: match[0],
            aliasType: alias.aliasType as AliasType,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: alias.confidence || 1.0,
            isPartialMatch: false,
          });
        }
      }
    }

    // Remove duplicates (same position)
    const uniqueMatches = matches.filter(
      (match, index, self) =>
        index ===
        self.findIndex(
          (m) => m.startIndex === match.startIndex && m.endIndex === match.endIndex
        )
    );

    // Sort by position
    uniqueMatches.sort((a, b) => a.startIndex - b.startIndex);

    return uniqueMatches;
  }

  /**
   * Check if brand is mentioned in text
   */
  async isBrandMentioned(
    text: string,
    brandId: string,
    minConfidence: number = 0.7
  ): Promise<boolean> {
    const mentions = await this.findBrandMentions(text, brandId);
    return mentions.some((m) => m.confidence >= minConfidence);
  }

  /**
   * Count brand mentions in text
   */
  async countBrandMentions(
    text: string,
    brandId: string,
    minConfidence: number = 0.7
  ): Promise<number> {
    const mentions = await this.findBrandMentions(text, brandId);
    return mentions.filter((m) => m.confidence >= minConfidence).length;
  }

  /**
   * Get the primary alias for a brand
   */
  async getPrimaryAlias(brandId: string): Promise<BrandAlias | undefined> {
    const aliases = await this.getAliasesByBrand(brandId);
    return aliases.find((a) => a.isPrimary);
  }

  /**
   * Set a new primary alias for a brand
   */
  async setPrimaryAlias(brandId: string, aliasId: number): Promise<void> {
    const workspace_id = workspaceId();
    await prisma.$transaction(async (transaction) => {
      const alias = await transaction.brand_aliases.findFirst({ where: { id: aliasId, brand_id: brandId, workspace_id } });
      if (!alias) throw new Error('Alias not found for this brand and workspace');
      await transaction.brand_aliases.updateMany({
        where: { workspace_id, brand_id: brandId, is_primary: true },
        data: { is_primary: false, updated_at: new Date() },
      });
      await transaction.brand_aliases.update({ where: { id: alias.id }, data: { is_primary: true, updated_at: new Date() } });
    });

    this.clearCache();
  }

  // ==================== Auto-Generation Helpers ====================

  /**
   * Generate common variations of a brand name
   */
  generateVariations(brandName: string): Array<{ alias: string; aliasType: AliasType }> {
    const variations: Array<{ alias: string; aliasType: AliasType }> = [];

    // Add original as primary (will be marked separately)
    variations.push({ alias: brandName, aliasType: 'primary' });

    // Lowercase version if different
    const lower = brandName.toLowerCase();
    if (lower !== brandName) {
      variations.push({ alias: lower, aliasType: 'variation' });
    }

    // Handle CamelCase or spaces - create acronym
    const parts = brandName.split(/(?=[A-Z])|[\s_-]+/).filter((p) => p);
    if (parts.length > 1) {
      const acronym = parts.map((p) => p[0]).join('').toUpperCase();
      if (acronym.length >= 2) {
        variations.push({ alias: acronym, aliasType: 'abbreviation' });
      }
    }

    // Remove common suffixes
    const suffixes = ['Inc', 'Inc.', 'LLC', 'Ltd', 'Ltd.', 'Corp', 'Corp.', 'Co', 'Co.'];
    for (const suffix of suffixes) {
      if (brandName.endsWith(` ${suffix}`)) {
        const withoutSuffix = brandName.slice(0, -(suffix.length + 1)).trim();
        variations.push({ alias: withoutSuffix, aliasType: 'variation' });
      }
    }

    return variations;
  }

  /**
   * Generate common misspellings for a word
   */
  generateMisspellings(word: string): string[] {
    const misspellings: string[] = [];

    // Double letter variations
    for (let i = 0; i < word.length - 1; i++) {
      if (word[i] === word[i + 1]) {
        // Remove double
        misspellings.push(word.slice(0, i) + word.slice(i + 1));
      } else {
        // Add double
        misspellings.push(word.slice(0, i + 1) + word[i] + word.slice(i + 1));
      }
    }

    // Adjacent letter swaps
    for (let i = 0; i < word.length - 1; i++) {
      const swapped = word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
      misspellings.push(swapped);
    }

    // Common substitutions
    const substitutions: Record<string, string[]> = {
      i: ['e', 'y'],
      e: ['i', 'a'],
      a: ['e', 'o'],
      o: ['u', 'a'],
      c: ['k', 's'],
      k: ['c'],
      s: ['z', 'c'],
      z: ['s'],
    };

    const lowerWord = word.toLowerCase();
    for (const [from, toList] of Object.entries(substitutions)) {
      if (lowerWord.includes(from)) {
        for (const to of toList) {
          misspellings.push(word.replace(new RegExp(from, 'gi'), to));
        }
      }
    }

    return Array.from(new Set(misspellings)).filter((m) => m !== word);
  }

  /**
   * Auto-generate and save all variations for a brand
   */
  async autoGenerateAliases(
    brandId: string,
    brandName: string,
    options: {
      includeMisspellings?: boolean;
      matchPartial?: boolean;
    } = {}
  ): Promise<BrandAlias[]> {
    const { includeMisspellings = true, matchPartial = false } = options;

    const variations = this.generateVariations(brandName);
    const aliases: Array<Omit<InsertBrandAlias, 'normalizedAlias'>> = [];

    // Add variations
    for (const variation of variations) {
      const exists = await this.aliasExists(brandId, variation.alias);
      if (!exists) {
        aliases.push({
          brandId,
          alias: variation.alias,
          aliasType: variation.aliasType,
          matchPartial,
          isPrimary: variation.aliasType === 'primary',
          confidence: variation.aliasType === 'primary' ? 1.0 : 0.95,
        });
      }
    }

    // Add misspellings
    if (includeMisspellings) {
      const misspellings = this.generateMisspellings(brandName);
      for (const misspelling of misspellings.slice(0, 10)) {
        // Limit to 10 misspellings
        const exists = await this.aliasExists(brandId, misspelling);
        if (!exists) {
          aliases.push({
            brandId,
            alias: misspelling,
            aliasType: 'misspelling',
            matchPartial: false,
            isPrimary: false,
            confidence: 0.7,
          });
        }
      }
    }

    return this.createAliases(aliases);
  }
}

/** Singleton getter */
let aliasManager: AliasManager | null = null;

export function getAliasManager(): AliasManager {
  if (!aliasManager) {
    aliasManager = AliasManager.getInstance();
  }
  return aliasManager;
}
