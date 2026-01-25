/**
 * Shared Types Index
 *
 * Re-exports all shared types for convenient importing.
 * Usage: import { DashboardResponse, Insight } from '@shared/types';
 *
 * CANONICAL TYPE LOCATIONS:
 * - TrendDirection: ./insights.ts (use 'up' | 'down' | 'stable')
 * - Insight types: ./insights.ts
 * - Visibility types: ./visibility.ts
 * - Dashboard types: ./dashboard.ts
 * - Platform types: ./platforms.ts
 */

// Insights first (defines TrendDirection)
export * from './insights';

// Visibility (depends on insights for TrendDirection)
export * from './visibility';

// Dashboard
export * from './dashboard';

// Competitors
export * from './competitors';

// Platforms
export * from './platforms';

// Intelligence
export * from './intelligence';

// Prompts & Topics
export * from './prompts';

// Citations
export * from './citations';

// Site Health
export * from './site-health';
