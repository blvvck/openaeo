/**
 * Database Seed Script
 *
 * Seeds the database with initial platform data.
 * Run with: npm run db:seed
 */

import { prisma } from '../prisma';
import type { InsertPlatform } from '@shared/schema';


const PLATFORM_SEED_DATA: InsertPlatform[] = [
  {
    slug: 'openai',
    name: 'OpenAI',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 60,
    rateLimitConcurrent: 3,
  },
  {
    slug: 'anthropic',
    name: 'Anthropic',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 50,
    rateLimitConcurrent: 2,
  },
  {
    slug: 'perplexity',
    name: 'Perplexity',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 20,
    rateLimitConcurrent: 1,
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 60,
    rateLimitConcurrent: 4,
  },
  {
    slug: 'xai',
    name: 'xAI',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 60,
    rateLimitConcurrent: 1,
  },
  {
    slug: 'deepseek',
    name: 'DeepSeek',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 60,
    rateLimitConcurrent: 2,
  },
  {
    slug: 'ai_mode',
    name: 'AI Mode',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 60,
    rateLimitConcurrent: 2,
  },
  {
    slug: 'ai_overviews',
    name: 'AI Overviews',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 60,
    rateLimitConcurrent: 2,
  },
];

/**
 * Seed platforms table
 * Uses upsert pattern - updates if slug exists, inserts if not
 */
async function seedPlatforms(): Promise<void> {
  console.log('Seeding platforms...');

  for (const platform of PLATFORM_SEED_DATA) {
    await prisma.platforms.upsert({
      where: { slug: platform.slug },
      create: {
        slug: platform.slug,
        name: platform.name,
        icon_url: platform.iconUrl,
        is_active: platform.isActive,
        rate_limit_rpm: platform.rateLimitRpm,
        rate_limit_concurrent: platform.rateLimitConcurrent,
      },
      update: {
        name: platform.name,
        icon_url: platform.iconUrl,
        is_active: platform.isActive,
        rate_limit_rpm: platform.rateLimitRpm,
        rate_limit_concurrent: platform.rateLimitConcurrent,
      },
    });
    console.log(`  Seeded platform: ${platform.slug}`);
  }

  console.log(`Seeded ${PLATFORM_SEED_DATA.length} platforms`);
}

/**
 * Main seed function
 */
async function seed(): Promise<void> {
  console.log('Starting database seed...\n');

  try {
    await seedPlatforms();
    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
seed();
