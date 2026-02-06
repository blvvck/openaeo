import { createHash } from "node:crypto";
import type { Prisma, workspaces } from "@prisma/client";

const DEMO_SEED_VERSION = 12;
const DEMO_RIVALS = ["Northstar CRM", "Orbit Sales", "Pipedrive"] as const;
const BOT_PATHS = ["/", "/blog/ai-guide", "/docs/api", "/pricing", "/features", "/blog/case-study"];
const DEMO_BOTS = [
  "GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended", "Cohere-ai", "CCBot",
  "Googlebot", "bingbot", "DuckDuckBot", "YandexBot", "Baiduspider",
  "Twitterbot", "facebookexternalhit", "LinkedInBot", "Slackbot",
] as const;
const DEMO_JOURNEY_STAGES = ["comparing", "solution-seeking", "problem-aware", "buying"] as const;

export function demoMentionMix(daysAgo: number, index: number) {
  const day = daysAgo % 14;
  const brandMentioned = (day * 3 + index * 7) % 10 < 7 + (day % 3);
  const rivals = DEMO_RIVALS.filter((_, rivalIndex) =>
    (day * 7 + index * 3 + rivalIndex * 3) % 11 < [7, 5, 4][rivalIndex] + ((day + rivalIndex * 2) % 3),
  );
  return { brandMentioned, rivals: [...rivals] };
}

function demoResponseText(topic: string, brandMentioned: boolean, before: string[], after: string[]) {
  const parts = [
    before.length ? `${before.join(', ')} are mentioned before Acme for ${topic}.` : '',
    brandMentioned ? `Acme is an option for ${topic}.` : '',
    after.length ? `${after.join(', ')} are also compared.` : '',
  ];
  return parts.filter(Boolean).join(' ') || `Reviewers compare several options for ${topic}.`;
}

function demoBotVisits(workspaceId: string, now: Date) {
  const rows = [];
  for (let daysAgo = 0; daysAgo < 60; daysAgo++) {
    for (let botIndex = 0; botIndex < DEMO_BOTS.length; botIndex++) {
      const botType = DEMO_BOTS[botIndex];
      const count = 2 + (botIndex % 4) + ((daysAgo + botIndex) % 3);
      for (let visitIndex = 0; visitIndex < count; visitIndex++) {
        rows.push({
          workspace_id: workspaceId,
          bot_type: botType,
          user_agent: `${botType}/1.0`,
          url: BOT_PATHS[(daysAgo + botIndex + visitIndex) % BOT_PATHS.length],
          visited_at: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - visitIndex * 60_000 - botIndex * 1_000),
          status_code: 200,
          response_time_ms: 90 + ((daysAgo + visitIndex + botIndex) % 140),
          content_type: "text/html",
          content_length_bytes: 32000 + ((daysAgo * 97 + botIndex * 113 + visitIndex * 251) % 24000),
        });
      }
    }
  }
  return rows;
}

async function syncDemoMetrics(client: Prisma.TransactionClient, workspaceId: string): Promise<void> {
  const [promptCount, sourceCount, responseCount, mentionCount] = await Promise.all([
    client.prompts.count({ where: { workspace_id: workspaceId } }),
    client.sources.count({ where: { workspace_id: workspaceId } }),
    client.responses.count({ where: { workspace_id: workspaceId } }),
    client.responses.count({ where: { workspace_id: workspaceId, brand_mentioned: true } }),
  ]);
  const mentionRate = responseCount > 0 ? Math.round((mentionCount / responseCount) * 1000) / 1000 : 0;
  await client.analytics.updateMany({
    where: { workspace_id: workspaceId },
    data: {
      total_prompts: promptCount,
      total_sources: sourceCount,
      total_domains: sourceCount,
      brand_mention_rate: mentionRate,
    },
  });
  const [competitorRows, responseRows] = await Promise.all([
    client.competitors.findMany({ where: { workspace_id: workspaceId }, select: { id: true, name: true } }),
    client.responses.findMany({ where: { workspace_id: workspaceId }, select: { text: true, competitors_mentioned: true } }),
  ]);
  for (const competitor of competitorRows) {
    const mentions = responseRows.filter(({ text, competitors_mentioned }) =>
      (Array.isArray(competitors_mentioned) && competitors_mentioned.includes(competitor.name)) ||
      text.toLowerCase().includes(competitor.name.toLowerCase())
    ).length;
    const score = responseRows.length > 0 ? Math.round((mentions / responseRows.length) * 1000) / 10 : 0;
    await client.competitors.update({
      where: { id: competitor.id },
      data: { initial_score: score, mention_count: mentions },
    });
  }
}

async function attachRecentSources(client: Prisma.TransactionClient, workspaceId: string): Promise<void> {
  const marker = "Also compare CRM coverage";
  const marked = await client.responses.findMany({
    where: { workspace_id: workspaceId, text: { contains: marker } },
    select: { id: true, text: true },
  });
  for (const { id, text } of marked) {
    await client.responses.update({ where: { id }, data: { text: text.split(marker)[0].trim() } });
  }
  const addedSources = `${marker} from techcrunch.com/reviews/acme-crm, getapp.com/customer-management-software/acme, trustradius.com/products/acme/reviews, gartner.com/reviews/acme-crm, pcmag.com/reviews/acme-crm, and saasworthy.com/product/acme-crm.`;
  const latestResponse = await client.responses.findFirst({
    where: { workspace_id: workspaceId },
    orderBy: { created_at: "desc" },
  });
  if (latestResponse) {
    await client.responses.update({
      where: { id: latestResponse.id },
      data: { text: `${latestResponse.text} ${addedSources}` },
    });
  }
}

async function ensureDemoHistory(client: Prisma.TransactionClient, workspaceId: string): Promise<void> {
  const now = new Date();
  const [botVisitCount, sources] = await Promise.all([
    client.bot_visits.count({ where: { workspace_id: workspaceId } }),
    client.sources.findMany({ where: { workspace_id: workspaceId }, select: { domain: true } }),
  ]);
  if (botVisitCount < 1000) await client.bot_visits.createMany({ data: demoBotVisits(workspaceId, now) });
  await client.bot_visits.updateMany({
    where: { workspace_id: workspaceId, bot_type: "cohere-ai" },
    data: { bot_type: "Cohere-ai", user_agent: "Cohere-ai/1.0" },
  });
  const knownDomains = new Set(sources.map(({ domain }) => domain));
  const extraSources = [
    ["techradar.com", "https://techradar.com/reviews/acme-crm", 13],
    ["techcrunch.com", "https://techcrunch.com/reviews/acme-crm", 12],
    ["getapp.com", "https://getapp.com/customer-management-software/acme", 10],
    ["trustradius.com", "https://trustradius.com/products/acme/reviews", 9],
    ["gartner.com", "https://gartner.com/reviews/acme-crm", 8],
    ["pcmag.com", "https://pcmag.com/reviews/acme-crm", 7],
    ["saasworthy.com", "https://saasworthy.com/product/acme-crm", 6],
  ] as const;
  await client.sources.createMany({
    data: extraSources
      .filter(([domain]) => !knownDomains.has(domain))
      .map(([domain, url, count]) => ({ workspace_id: workspaceId, domain, url, citation_count: count, last_cited: now })),
  });
  await seedTopicExamples(client, workspaceId, now);
  await attachRecentSources(client, workspaceId);
  await syncDemoMetrics(client, workspaceId);
}

async function seedTopicExamples(client: Prisma.TransactionClient, workspaceId: string, now: Date): Promise<void> {
  const crmTopic = await client.topics.findFirst({ where: { workspace_id: workspaceId, name: "CRM research" } });
  if (crmTopic) {
    const crmPrompts = await client.prompts.findMany({ where: { workspace_id: workspaceId, topic_id: crmTopic.id } });
    for (let index = 0; index < crmPrompts.length; index++) {
      await client.prompts.update({
        where: { id: crmPrompts[index].id },
        data: { journey_stages: [DEMO_JOURNEY_STAGES[index % DEMO_JOURNEY_STAGES.length]] },
      });
    }
    const recentMentions = await client.responses.count({
      where: {
        workspace_id: workspaceId,
        prompt_id: { in: crmPrompts.map(({ id }) => id) },
        brand_mentioned: true,
        created_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    const prompt = crmPrompts[0];
    if (prompt && recentMentions < 6) {
      await client.responses.createMany({
        data: Array.from({ length: 6 - recentMentions }, (_, index) => {
          const mix = demoMentionMix(index, index);
          return {
            workspace_id: workspaceId,
            prompt_id: prompt.id,
            platform: ["chatgpt", "claude", "perplexity"][index % 3],
            text: demoResponseText("CRM research", mix.brandMentioned, mix.rivals.slice(0, 1), mix.rivals.slice(1)),
            brand_mentioned: mix.brandMentioned,
            competitors_mentioned: mix.rivals,
            sources: [],
            created_at: new Date(now.getTime() - (index + 1) * 60 * 60 * 1000),
          };
        }),
      });
    }
    if (prompt) {
      for (const period of [
        { fromDaysAgo: 7, toDaysAgo: 15, target: 6, firstDayAgo: 9, span: 6 },
        { fromDaysAgo: 15, toDaysAgo: 30, target: 6, firstDayAgo: 17, span: 13 },
      ]) {
        const count = await client.responses.count({
          where: {
            workspace_id: workspaceId,
            prompt_id: { in: crmPrompts.map(({ id }) => id) },
            brand_mentioned: true,
            created_at: {
              gte: new Date(now.getTime() - period.toDaysAgo * 24 * 60 * 60 * 1000),
              lt: new Date(now.getTime() - period.fromDaysAgo * 24 * 60 * 60 * 1000),
            },
          },
        });
        if (count < period.target) {
          await client.responses.createMany({
            data: Array.from({ length: period.target - count }, (_, index) => {
              const daysAgo = period.firstDayAgo + (index % period.span);
              const mix = demoMentionMix(daysAgo, index + period.firstDayAgo);
              return {
                workspace_id: workspaceId,
                prompt_id: prompt.id,
                platform: ["chatgpt", "claude", "perplexity"][index % 3],
                text: demoResponseText("CRM research", mix.brandMentioned, mix.rivals.slice(0, 1), mix.rivals.slice(1)),
                brand_mentioned: mix.brandMentioned,
                competitors_mentioned: mix.rivals,
                sources: [],
                created_at: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
              };
            }),
          });
        }
      }
    }
    const crmResponses = await client.responses.findMany({
      where: { workspace_id: workspaceId, prompt_id: { in: crmPrompts.map(({ id }) => id) } },
      orderBy: { created_at: 'asc' },
    });
    for (let index = 0; index < crmResponses.length; index++) {
      const response = crmResponses[index];
      const daysAgo = Math.max(0, Math.round((now.getTime() - (response.created_at?.getTime() ?? now.getTime())) / 86_400_000));
      const mix = demoMentionMix(daysAgo, index);
      const before = mix.rivals.slice(0, index % (mix.rivals.length + 1));
      const urls = response.text.match(/[a-z0-9.-]+\.[a-z]{2,}\/\S+/gi) ?? [];
      await client.responses.update({
        where: { id: response.id },
        data: {
          text: [demoResponseText("CRM research", mix.brandMentioned, before, mix.rivals.slice(before.length)), ...urls].join(' '),
          brand_mentioned: mix.brandMentioned,
          competitors_mentioned: mix.rivals,
        },
      });
    }
  }

  const examples = [
    {
      topic: "Sales pipeline management",
      prompt: "best sales pipeline management CRM tools",
      currentCount: 6,
      previousCount: 4,
      currentOrder: 0,
      previousOrder: 3,
      journeyStage: "comparing",
    },
    {
      topic: "Lead generation CRM",
      prompt: "CRM platforms for managing lead generation",
      currentCount: 7,
      previousCount: 6,
      currentOrder: 1,
      previousOrder: 3,
      journeyStage: "solution-seeking",
    },
    {
      topic: "CRM workflow automation",
      prompt: "best CRM workflow automation software",
      currentCount: 8,
      previousCount: 8,
      currentOrder: 2,
      previousOrder: 3,
      journeyStage: "comparing",
    },
    {
      topic: "CRM for startups",
      prompt: "best CRM software for early-stage startups",
      currentCount: 9,
      previousCount: 10,
      currentOrder: 0,
      previousOrder: 3,
      journeyStage: "buying",
    },
    {
      topic: "Deal pipeline software",
      prompt: "best deal pipeline software for small sales teams",
      currentCount: 10,
      previousCount: 12,
      currentOrder: 1,
      previousOrder: 3,
      journeyStage: "comparing",
    },
    {
      topic: "CRM reporting",
      prompt: "best CRM reporting tools for small teams",
      currentCount: 2,
      previousCount: 6,
      currentOrder: 3,
      previousOrder: 3,
      journeyStage: "using",
    },
    {
      topic: "Contact management",
      prompt: "best contact management software for small businesses",
      currentCount: 2,
      previousCount: 6,
      currentOrder: 3,
      previousOrder: 3,
      journeyStage: "solution-seeking",
    },
    {
      topic: "Sales forecasting",
      prompt: "CRM tools for accurate sales forecasting",
      currentCount: 2,
      previousCount: 8,
      currentOrder: 3,
      previousOrder: 3,
      journeyStage: "buying",
    },
    {
      topic: "Lead scoring",
      prompt: "best lead scoring software for B2B sales teams",
      currentCount: 2,
      previousCount: 6,
      currentOrder: 3,
      previousOrder: 3,
      journeyStage: "solution-seeking",
    },
    {
      topic: "Customer support software",
      prompt: "best customer support software for growing teams",
      currentCount: 2,
      previousCount: 6,
      currentOrder: 3,
      previousOrder: 0,
      journeyStage: "problem-aware",
    },
    {
      topic: "Customer retention software",
      prompt: "best customer retention software for SaaS businesses",
      currentCount: 2,
      previousCount: 7,
      currentOrder: 3,
      previousOrder: 1,
      journeyStage: "problem-aware",
    },
    {
      topic: "Sales engagement platforms",
      prompt: "top sales engagement platforms for small teams",
      currentCount: 3,
      previousCount: 8,
      currentOrder: 3,
      previousOrder: 2,
      journeyStage: "comparing",
    },
    {
      topic: "Marketing automation CRM",
      prompt: "CRM with marketing automation for growing companies",
      currentCount: 4,
      previousCount: 9,
      currentOrder: 3,
      previousOrder: 0,
      journeyStage: "solution-seeking",
    },
    {
      topic: "Customer onboarding tools",
      prompt: "best customer onboarding tools for SaaS teams",
      currentCount: 5,
      previousCount: 10,
      currentOrder: 3,
      previousOrder: 1,
      journeyStage: "using",
    },
    {
      topic: "Customer success platforms",
      prompt: "best customer success platforms for small businesses",
      currentCount: 2,
      previousCount: 7,
      currentOrder: 3,
      previousOrder: 2,
      journeyStage: "using",
    },
    {
      topic: "Revenue operations software",
      prompt: "best revenue operations software for growing teams",
      currentCount: 2,
      previousCount: 9,
      currentOrder: 3,
      previousOrder: 0,
      journeyStage: "buying",
    },
    {
      topic: "Support ticket automation",
      prompt: "best support ticket automation tools",
      currentCount: 2,
      previousCount: 12,
      currentOrder: 3,
      previousOrder: 0,
      journeyStage: "problem-aware",
    },
  ] as const;

  for (let exampleIndex = 0; exampleIndex < examples.length; exampleIndex++) {
    const example = examples[exampleIndex];
    const existingTopic = await client.topics.findFirst({ where: { workspace_id: workspaceId, name: example.topic } });
    const topic = existingTopic ?? await client.topics.create({
      data: { workspace_id: workspaceId, name: example.topic, description: `Demo prompts for ${example.topic.toLowerCase()}` },
    });
    const existingPrompt = await client.prompts.findFirst({ where: { workspace_id: workspaceId, text: example.prompt } });
    const prompt = existingPrompt
      ? await client.prompts.update({ where: { id: existingPrompt.id }, data: { topic_id: topic.id, topic_ids: [topic.id], journey_stages: [example.journeyStage] } })
      : await client.prompts.create({
        data: {
        workspace_id: workspaceId,
        text: example.prompt,
        topic_id: topic.id,
        topic_ids: [topic.id],
        journey_stages: [example.journeyStage],
        is_priority: false,
        },
      });
    await client.responses.deleteMany({ where: { workspace_id: workspaceId, prompt_id: prompt.id } });

    const rows = [
      ...Array.from({ length: example.currentCount }, (_, index) => ({
        daysAgo: index % 7,
        platform: ["chatgpt", "claude", "perplexity"][index % 3],
        beforeCount: example.currentOrder,
        index,
      })),
      ...Array.from({ length: example.previousCount }, (_, index) => ({
        daysAgo: 8 + ((index * 5 + exampleIndex * 3) % 22),
        platform: ["chatgpt", "claude", "perplexity"][index % 3],
        beforeCount: example.previousOrder,
        index: index + example.currentCount,
      })),
    ];
    await client.responses.createMany({
      data: rows.map(({ daysAgo, platform, beforeCount, index }) => {
        const mix = demoMentionMix(daysAgo, index);
        const before = mix.rivals.slice(0, beforeCount % (mix.rivals.length + 1));
        return {
          workspace_id: workspaceId,
          prompt_id: prompt.id,
          platform,
          text: demoResponseText(example.topic, mix.brandMentioned, before, mix.rivals.slice(before.length)),
          brand_mentioned: mix.brandMentioned,
          competitors_mentioned: mix.rivals,
          sources: [],
          created_at: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        };
      }),
    });
  }
}

export function demoSlug(userId: string): string {
  return `demo-${createHash("sha256").update(userId).digest("hex").slice(0, 20)}`;
}

export function isDemoWorkspace(workspace: Pick<workspaces, "is_demo">): boolean {
  return workspace.is_demo;
}

export function isOwnedDemoWorkspace(
  workspace: Pick<workspaces, "is_demo" | "owner_id">,
  userId: string,
): boolean {
  return workspace.is_demo && workspace.owner_id === userId;
}

export function isDemoWrite(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export function isDemoSlugConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; meta?: { target?: unknown } };
  if (candidate.code !== "P2002") return false;
  const target = Array.isArray(candidate.meta?.target) ? candidate.meta.target : [];
  return target.length === 0 || target.includes("slug") || target.includes("idx_workspaces_slug");
}

export async function ensureDemoWorkspace(
  client: Prisma.TransactionClient,
  userId: string,
): Promise<workspaces> {
  const slug = demoSlug(userId);
  const existing = await client.workspaces.findUnique({ where: { slug } });
  if (existing) {
    if (!isOwnedDemoWorkspace(existing, userId)) {
      throw new Error("Demo workspace slug is already owned by another workspace");
    }
    await client.workspace_members.upsert({
      where: { workspace_id_user_id: { workspace_id: existing.id, user_id: userId } },
      create: { workspace_id: existing.id, user_id: userId, role: "owner" },
      update: {},
    });
    if (existing.demo_seed_version < DEMO_SEED_VERSION) {
      await client.$executeRaw`SELECT set_config('app.current_workspace_id', ${existing.id}, true)`;
      await seedDemoWorkspace(client, existing.id);
    }
    return existing.name === "Demo"
      ? existing
      : client.workspaces.update({ where: { id: existing.id }, data: { name: "Demo" } });
  }

  const workspace = await client.workspaces.create({
    data: {
      name: "Demo",
      slug,
      owner_id: userId,
      plan: "free",
      is_demo: true,
      onboarding_completed_at: new Date(),
    },
  });

  await client.workspace_members.create({
    data: { workspace_id: workspace.id, user_id: userId, role: "owner" },
  });

  await client.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspace.id}, true)`;
  await seedDemoWorkspace(client, workspace.id);
  return workspace;
}

async function seedDemoWorkspace(client: Prisma.TransactionClient, workspaceId: string): Promise<void> {
  const existingBrand = await client.brand_config.count({ where: { workspace_id: workspaceId } });
  if (existingBrand > 0) {
    await ensureDemoHistory(client, workspaceId);
    await client.workspaces.update({ where: { id: workspaceId }, data: { demo_seed_version: DEMO_SEED_VERSION } });
    return;
  }

  const now = new Date();
  const previous = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const topic = await client.topics.create({
    data: { workspace_id: workspaceId, name: "CRM research", description: "Demo prompts for CRM discovery" },
  });
  const prompts = await Promise.all([
    "best CRM for small businesses",
    "CRM tools for growing teams",
    "how to automate sales follow-up",
    "Acme CRM pricing and features",
  ].map((text) => client.prompts.create({
    data: {
      workspace_id: workspaceId,
      text,
      topic_id: topic.id,
      topic_ids: [topic.id],
      journey_stages: ["discovery"],
      is_priority: false,
    },
  })));

  const responseRows = [
    ["chatgpt", "Acme is an easy-to-use CRM for small businesses. See g2.com/products/acme and capterra.com/acme-reviews for reviews; TechCrunch compares CRM tools at techcrunch.com/reviews/acme-crm.", true],
    ["claude", "Acme combines flexible automation with a clear setup. Compare acme.com/pricing with forbes.com/best-crm-2026 and customer reviews on getapp.com/customer-management-software/acme.", true],
    ["perplexity", "Acme is frequently cited among CRM tools for growing teams, including reviews on trustpilot.com/review/acme and trustradius.com/products/acme/reviews.", true],
    ["gemini", "Softwareadvice.com/acme-reviews highlights Acme's approachable workflow and TechRadar reviews its integrations. Gartner also covers CRM at gartner.com/reviews/acme-crm.", true],
    ["chatgpt", "Acme supports sales teams with automation and reporting, with additional context from reddit.com/r/crm/acme-review and pcmag.com/reviews/acme-crm.", true],
    ["claude", "Acme offers a practical CRM workflow for growing teams and publishes details at acme.com/features. See saasworthy.com/product/acme-crm for more reviews.", true],
  ] as const;
  await Promise.all(responseRows.map(([platform, text, mentioned], index) => client.responses.create({
    data: {
      workspace_id: workspaceId,
      prompt_id: prompts[index % prompts.length].id,
      platform,
      text,
      brand_mentioned: mentioned,
      competitors_mentioned: ["Northstar CRM"],
      sources: [],
      created_at: index < 4 ? now : previous,
    },
  })));

  await client.brand_config.create({
    data: {
      workspace_id: workspaceId,
      name: "Acme Inc.",
      domain: "acme.com",
      aliases: ["Acme"],
      competitor_list: ["Northstar CRM", "Orbit Sales", "Pipedrive"],
    },
  });
  await client.competitors.createMany({
    data: ([
      ["Northstar CRM", "northstarcrm.com"],
      ["Orbit Sales", "orbitsales.com"],
      ["Pipedrive", "pipedrive.com"],
    ] as const).map(([name, domain]) => ({
      workspace_id: workspaceId,
      name,
      domain,
      initial_score: 0,
      mention_count: 0,
      platforms_found: ["chatgpt", "claude", "perplexity"],
    })),
  });
  await client.sources.createMany({
    data: ([
      ["g2.com", "https://g2.com/products/acme", 47],
      ["capterra.com", "https://capterra.com/acme-reviews", 28],
      ["forbes.com", "https://forbes.com/best-crm-2026", 22],
      ["trustpilot.com", "https://trustpilot.com/review/acme", 19],
      ["softwareadvice.com", "https://softwareadvice.com/acme-reviews", 16],
      ["techradar.com", "https://techradar.com/reviews/acme-crm", 13],
      ["techcrunch.com", "https://techcrunch.com/reviews/acme-crm", 12],
      ["getapp.com", "https://getapp.com/customer-management-software/acme", 10],
      ["trustradius.com", "https://trustradius.com/products/acme/reviews", 9],
      ["gartner.com", "https://gartner.com/reviews/acme-crm", 8],
      ["pcmag.com", "https://pcmag.com/reviews/acme-crm", 7],
      ["saasworthy.com", "https://saasworthy.com/product/acme-crm", 6],
    ] as const).map(([domain, url, count]) => ({ workspace_id: workspaceId, domain, url, citation_count: count, last_cited: now })),
  });
  await client.analytics.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((daysAgo) => ({
      workspace_id: workspaceId,
      date: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      total_prompts: 0,
      brand_mention_rate: 0,
      top_competitor: "Northstar CRM",
      total_sources: 0,
      total_domains: 0,
    })),
  });
  await client.bot_visits.createMany({ data: demoBotVisits(workspaceId, now) });
  await seedTopicExamples(client, workspaceId, now);
  await attachRecentSources(client, workspaceId);
  await syncDemoMetrics(client, workspaceId);
  await client.prompt_tracking_settings.create({ data: { workspace_id: workspaceId, frequency: "daily" } });
  await client.workspaces.update({ where: { id: workspaceId }, data: { demo_seed_version: DEMO_SEED_VERSION } });
}

