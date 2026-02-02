/**
 * ⚠️ CRITICAL CODE - Do not modify without review
 *
 * This file is registered in .claude/CRITICAL_CODE.md
 *
 * Why critical: Single source of truth for app identity
 * Dependencies: App.tsx and sidebar
 *
 * Before changing: Read CRITICAL_CODE.md entry first.
 *
 * ---
 *
 * App Configuration
 *
 * Central place for app-wide constants.
 * Change values here and they update everywhere.
 */

export const APP_CONFIG = {
  /** App name displayed in sidebar, headers, etc. */
  name: "OpenAEO",

  /** Full app name with company prefix */
  fullName: "OpenAEO",

  /** App description for meta tags, etc. */
  description: "Track your brand's visibility across AI platforms",
} as const;
