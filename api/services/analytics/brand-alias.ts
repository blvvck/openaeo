/**
 * Brand Alias Manager
 *
 * Handles brand name variations for improved mention detection.
 * Supports case-insensitive matching, partial matches, and common misspellings.
 */

export interface BrandAlias {
  /** Alias text */
  alias: string;
  /** Whether to match partial occurrences */
  matchPartial: boolean;
  /** Whether this is the primary name */
  isPrimary: boolean;
}

export interface BrandConfig {
  /** Primary brand name */
  name: string;
  /** All aliases including variations */
  aliases: BrandAlias[];
  /** Common misspellings to detect */
  misspellings: string[];
  /** Industry for contextual matching */
  industry?: string;
}

export interface MentionMatch {
  /** Matched text */
  text: string;
  /** Which alias matched */
  alias: string;
  /** Start position in source text */
  startIndex: number;
  /** End position in source text */
  endIndex: number;
  /** Match type */
  matchType: 'exact' | 'partial' | 'misspelling';
  /** Match confidence (0-1) */
  confidence: number;
}

/**
 * Common brand name patterns for auto-generating aliases
 */
const COMMON_VARIATIONS = {
  // Suffix removals
  suffixes: ['Inc', 'Inc.', 'LLC', 'Ltd', 'Ltd.', 'Corp', 'Corp.', 'Co', 'Co.'],
  // Common separators
  separators: [' ', '-', '_', '.'],
};

/**
 * Generate common misspellings for a word
 */
function generateMisspellings(word: string): string[] {
  const misspellings: string[] = [];
  const lower = word.toLowerCase();

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

  // Common letter substitutions
  const substitutions: Record<string, string[]> = {
    'i': ['e', 'y'],
    'e': ['i', 'a'],
    'a': ['e', 'o'],
    'o': ['u', 'a'],
    'c': ['k', 's'],
    'k': ['c'],
    's': ['z', 'c'],
    'z': ['s'],
    'ph': ['f'],
    'f': ['ph'],
  };

  for (const [from, toList] of Object.entries(substitutions)) {
    if (lower.includes(from)) {
      for (const to of toList) {
        misspellings.push(word.replace(new RegExp(from, 'gi'), to));
      }
    }
  }

  // Adjacent letter swaps
  for (let i = 0; i < word.length - 1; i++) {
    const swapped = word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
    misspellings.push(swapped);
  }

  return Array.from(new Set(misspellings)).filter(m => m !== word);
}

/**
 * Generate standard aliases for a brand name
 */
export function generateAliases(brandName: string): BrandAlias[] {
  const aliases: BrandAlias[] = [
    { alias: brandName, matchPartial: false, isPrimary: true },
  ];

  // Lowercase version
  if (brandName.toLowerCase() !== brandName) {
    aliases.push({
      alias: brandName.toLowerCase(),
      matchPartial: false,
      isPrimary: false,
    });
  }

  // Remove common suffixes
  for (const suffix of COMMON_VARIATIONS.suffixes) {
    if (brandName.endsWith(` ${suffix}`)) {
      const withoutSuffix = brandName.slice(0, -(suffix.length + 1)).trim();
      aliases.push({
        alias: withoutSuffix,
        matchPartial: false,
        isPrimary: false,
      });
    }
  }

  // Handle CamelCase or spaces
  const parts = brandName.split(/(?=[A-Z])|[\s_-]+/).filter(p => p);
  if (parts.length > 1) {
    // Acronym
    const acronym = parts.map(p => p[0]).join('').toUpperCase();
    if (acronym.length >= 2) {
      aliases.push({
        alias: acronym,
        matchPartial: false,
        isPrimary: false,
      });
    }

    // Different separator variations
    for (const sep of COMMON_VARIATIONS.separators) {
      const joined = parts.join(sep);
      if (joined !== brandName) {
        aliases.push({
          alias: joined,
          matchPartial: false,
          isPrimary: false,
        });
      }
    }

    // No separator (concatenated)
    const concatenated = parts.join('');
    if (concatenated !== brandName) {
      aliases.push({
        alias: concatenated,
        matchPartial: false,
        isPrimary: false,
      });
    }
  }

  return aliases;
}

/**
 * Create a full brand configuration with auto-generated aliases
 */
export function createBrandConfig(
  brandName: string,
  customAliases: string[] = [],
  options: {
    generateMisspellings?: boolean;
    matchPartial?: boolean;
    industry?: string;
  } = {}
): BrandConfig {
  const {
    generateMisspellings: genMisspellings = true,
    matchPartial = false,
    industry,
  } = options;

  const aliases = generateAliases(brandName);

  // Add custom aliases
  for (const alias of customAliases) {
    if (!aliases.some(a => a.alias.toLowerCase() === alias.toLowerCase())) {
      aliases.push({
        alias,
        matchPartial,
        isPrimary: false,
      });
    }
  }

  // Generate misspellings
  const misspellings: string[] = [];
  if (genMisspellings) {
    misspellings.push(...generateMisspellings(brandName));
  }

  return {
    name: brandName,
    aliases,
    misspellings,
    industry,
  };
}

/**
 * Find all brand mentions in text using aliases
 */
export function findBrandMentions(
  text: string,
  config: BrandConfig
): MentionMatch[] {
  const matches: MentionMatch[] = [];
  const lowerText = text.toLowerCase();

  // Check each alias
  for (const alias of config.aliases) {
    const searchTerm = alias.alias.toLowerCase();

    if (alias.matchPartial) {
      // Find all occurrences
      let index = 0;
      while ((index = lowerText.indexOf(searchTerm, index)) !== -1) {
        matches.push({
          text: text.slice(index, index + searchTerm.length),
          alias: alias.alias,
          startIndex: index,
          endIndex: index + searchTerm.length,
          matchType: 'partial',
          confidence: alias.isPrimary ? 1 : 0.9,
        });
        index += searchTerm.length;
      }
    } else {
      // Word boundary matching
      const regex = new RegExp(`\\b${escapeRegex(searchTerm)}\\b`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          text: match[0],
          alias: alias.alias,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          matchType: 'exact',
          confidence: alias.isPrimary ? 1 : 0.95,
        });
      }
    }
  }

  // Check misspellings
  for (const misspelling of config.misspellings) {
    const regex = new RegExp(`\\b${escapeRegex(misspelling)}\\b`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        text: match[0],
        alias: misspelling,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        matchType: 'misspelling',
        confidence: 0.7,
      });
    }
  }

  // Remove duplicates (same position)
  const uniqueMatches = matches.filter((match, index, self) =>
    index === self.findIndex(m =>
      m.startIndex === match.startIndex && m.endIndex === match.endIndex
    )
  );

  // Sort by position
  uniqueMatches.sort((a, b) => a.startIndex - b.startIndex);

  return uniqueMatches;
}

/**
 * Check if brand is mentioned in text
 */
export function isBrandMentioned(
  text: string,
  config: BrandConfig,
  minConfidence: number = 0.7
): boolean {
  const mentions = findBrandMentions(text, config);
  return mentions.some(m => m.confidence >= minConfidence);
}

/**
 * Count brand mentions
 */
export function countBrandMentions(
  text: string,
  config: BrandConfig,
  minConfidence: number = 0.7
): number {
  const mentions = findBrandMentions(text, config);
  return mentions.filter(m => m.confidence >= minConfidence).length;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Merge multiple brand configs (for handling both brand and competitors)
 */
export function mergeConfigs(...configs: BrandConfig[]): BrandConfig {
  const merged: BrandConfig = {
    name: configs[0]?.name || '',
    aliases: [],
    misspellings: [],
  };

  for (const config of configs) {
    merged.aliases.push(...config.aliases);
    merged.misspellings.push(...config.misspellings);
  }

  // Deduplicate
  merged.aliases = merged.aliases.filter((alias, index, self) =>
    index === self.findIndex(a => a.alias.toLowerCase() === alias.alias.toLowerCase())
  );
  merged.misspellings = Array.from(new Set(merged.misspellings));

  return merged;
}
