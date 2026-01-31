import { requestJson } from "./openai-gateway";
import type { BrandSiteProfile } from "../site-intelligence/site-profiler";

export interface ResearchTopic {
  name: string;
  description: string;
}

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 100) : "";
}

function uniqueStrings(values: unknown, limit: number): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const item = value.replace(/^[-*\d.)\s]+/, "").replace(/["'`]/g, "").trim();
    const key = item.toLocaleLowerCase();
    if (item.length < 5 || item.length > 180 || seen.has(key)) continue;
    seen.add(key);
    if (seen.size === limit) break;
  }
  return Array.from(seen);
}

export async function generateTopicPrompts(
  topicName: string,
  topicDescription: string,
  count = 5,
  competitors: string[] = [],
): Promise<string[]> {
  const target = Math.max(1, Math.min(50, Math.floor(count)));
  try {
    const result = await requestJson<{ prompts?: unknown }>(
      "Create varied, realistic questions people would ask an AI assistant when evaluating products in the supplied topic. Return JSON with a prompts array of strings. Do not mention a company unless it is included in the request.",
      JSON.stringify({ topic: topicName, context: topicDescription, competitors, count: target }),
    );
    const prompts = uniqueStrings(result.prompts, target);
    if (prompts.length) return prompts;
  } catch (error) {
    if (process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR) throw error;
  }
  return buildQuestionSet(topicName, target, competitors);
}

function buildQuestionSet(topic: string, count: number, competitors: string[]): string[] {
  const angles = [
    `What should I compare when choosing ${topic}?`,
    `Which ${topic} option works well for a small team?`,
    `How do the leading ${topic} options differ?`,
    `What are common problems with ${topic}?`,
    `How can I evaluate ${topic} before buying?`,
    `What does ${topic} typically cost?`,
    `Which ${topic} solution is easiest to maintain?`,
    `What should a growing company look for in ${topic}?`,
    `How do I switch to a different ${topic} provider?`,
    `What questions should I ask about ${topic} support?`,
  ];
  const questions = [...angles];
  for (const name of competitors) questions.push(`How does ${name} compare with other ${topic} options?`);
  return Array.from(new Set(questions)).slice(0, count);
}

export async function suggestBrandTopics(profile: BrandSiteProfile, count: number): Promise<ResearchTopic[]> {
  const target = Math.max(1, Math.min(20, Math.floor(count)));
  const result = await requestJson<{ topics?: Array<{ name?: unknown; description?: unknown }> }>(
    "Identify customer-relevant product categories and buying questions from the supplied public website profile. Return JSON with a topics array; every topic must have a concise name and a one-sentence description grounded in the profile.",
    JSON.stringify({ site: profile, count: target }),
  );
  const topics = (result.topics || []).map((topic) => ({
    name: cleanName(topic.name),
    description: cleanName(topic.description),
  })).filter((topic) => topic.name && topic.description);
  if (!topics.length) throw new Error("No useful topic suggestions were returned for this website.");
  return topics.slice(0, target);
}

export async function findBrandCompetitors(profile: BrandSiteProfile): Promise<Array<{ name: string; url?: string; category: string }>> {
  const result = await requestJson<{ competitors?: Array<{ name?: unknown; url?: unknown; category?: unknown }> }>(
    "Find direct alternatives that serve the same customers and solve the same problem as this business. Exclude platforms merely mentioned in examples. Return JSON with competitors containing name, optional official URL, and category. Use an empty array when evidence is insufficient.",
    JSON.stringify({ brand: profile.title, domain: profile.domain, description: profile.description, pageText: profile.text }),
  );
  const seen = new Set<string>();
  return (result.competitors || []).flatMap((item) => {
    const name = cleanName(item.name);
    const key = name.toLocaleLowerCase();
    if (!name || key === profile.title.toLocaleLowerCase() || seen.has(key)) return [];
    seen.add(key);
    let url: string | undefined;
    try {
      if (typeof item.url === "string") {
        const parsed = new URL(item.url);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") url = parsed.toString();
      }
    } catch {}
    return [{ name, url, category: cleanName(item.category) || "Related alternative" }];
  }).slice(0, 12);
}

export async function identifyCompetitorsInText(text: string, brandName?: string): Promise<string[]> {
  const result = await requestJson<{ competitors?: unknown }>(
    "Extract company or product names that are explicitly presented as alternatives in this response. Do not infer competitors from incidental mentions. Exclude the monitored brand. Return JSON with a competitors array of names.",
    JSON.stringify({ brand: brandName || null, response: text.slice(0, 12_000) }),
  );
  return uniqueStrings(result.competitors, 10).filter((name) => name.toLocaleLowerCase() !== brandName?.toLocaleLowerCase());
}
