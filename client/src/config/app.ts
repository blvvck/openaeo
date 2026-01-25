/**
 * ⚠️ CRITICAL CODE - Do not modify without review
 *
 * This file is registered in .claude/CRITICAL_CODE.md
 *
 * Why critical: Single source of truth for app name and demo/placeholder data
 * Dependencies: App.tsx, Dashboard, sidebar, anywhere showing brand/user info
 *
 * RULE: Never hardcode "Demo User", "Acme Inc.", "your brand" etc.
 * Always use DEMO_CONFIG values instead.
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

/**
 * Demo/Placeholder Configuration
 *
 * These values are used for demo purposes.
 * In production, these would come from user data/API.
 */
export const DEMO_CONFIG = {
  /** Demo workspace/company name */
  workspaceName: "Acme Inc.",

  /** Demo brand name being tracked */
  brandName: "Acme",

  /** Demo user info */
  user: {
    name: "Demo User",
    email: "demo@acme.com",
    plan: "Pro plan",
  },
} as const;
