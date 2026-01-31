
import { PlatformName, PlatformConfig } from '../services/platforms/types';

export const PLATFORM_CONFIG: Record<PlatformName, PlatformConfig> = {
  chatgpt: {
    enabled: true,
    priority: 1,
    budgetLimitUsd: 1.0
  },
  perplexity: {
    enabled: true,
    priority: 2,
    budgetLimitUsd: 1.0
  },
  claude: {
    enabled: true,
    priority: 3,
    budgetLimitUsd: 1.0
  },
  gemini: {
    enabled: true,
    priority: 4,
    budgetLimitUsd: 0.5
  },
  grok: {
    enabled: true, // Enabled now!
    priority: 5,
    budgetLimitUsd: 0.5
  },
  deepseek: {
    enabled: true,
    priority: 6,
    budgetLimitUsd: 0.5
  },
  'google-ai-overview': {
    enabled: false, // Requires ScrapingDog subscription
    priority: 7,
    budgetLimitUsd: 1.0
  },
  'google-ai-mode': {
    enabled: false, // Requires ScrapingDog subscription
    priority: 8,
    budgetLimitUsd: 1.0
  }
};

export const ENABLED_PLATFORMS = (Object.keys(PLATFORM_CONFIG) as PlatformName[])
  .filter(key => PLATFORM_CONFIG[key].enabled)
  .sort((a, b) => PLATFORM_CONFIG[a].priority - PLATFORM_CONFIG[b].priority);

