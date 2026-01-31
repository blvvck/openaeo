import { Router } from "express";
import { storage } from "../data";
import { insertPromptSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Create a new prompt (manual)
router.post("/", async (req, res) => {
    try {
        const data = insertPromptSchema.parse(req.body);
        const prompt = await storage.createPrompt(data);
        res.status(201).json(prompt);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error("Error creating prompt:", error);
        res.status(500).json({ error: "Failed to create prompt" });
    }
});

// Update a prompt
router.patch("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const data = insertPromptSchema.partial().parse(req.body);
        const updated = await storage.updatePrompt(id, data);

        if (!updated) return res.status(404).json({ error: "Prompt not found" });

        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error("Error updating prompt:", error);
        res.status(500).json({ error: "Failed to update prompt" });
    }
});

// Get all prompts
router.get("/", async (req, res) => {
    try {
        const latestPrompts = await storage.getLatestPrompts();
        // Add topic information to each prompt
        const promptsWithTopics = await Promise.all(
            latestPrompts.map(async (prompt) => {
                const topic = prompt.topicId ? await storage.getTopicById(prompt.topicId) : null;
                return { ...prompt, topic };
            })
        );
        res.json(promptsWithTopics);
    } catch (error) {
        console.error("Error fetching prompts:", error);
        res.status(500).json({ error: "Failed to fetch prompts" });
    }
});

/**
 * GET /api/prompts/top
 * Returns top prompts by mention count with aggregated metrics
 *
 * Query params:
 * - timeRange: TimeRangePreset (default: '30d')
 * - limit: number (default: 5)
 */
router.get("/top", async (req, res) => {
    try {
        const { timeRange = '30d', limit = '5' } = req.query;
        const limitNum = Math.min(parseInt(limit as string) || 5, 20);

        // Calculate date range
        const now = new Date();
        let fromDate = new Date();
        const match = (timeRange as string).match(/^(\d+)d$/);
        if (match) {
            fromDate = new Date(now.getTime() - parseInt(match[1]) * 24 * 60 * 60 * 1000);
        } else {
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get prompts with topics
        const promptsWithTopics = await storage.getPromptsWithTopics();

        // Get all topics for lookup
        const allTopics = await storage.getTopics();
        const topicMap = new Map(allTopics.map(t => [t.id, t.name]));

        // Get responses in time range
        const responses = await storage.getResponsesInTimeRange(fromDate, now);

        // Get competitors for competitor mention detection
        const competitors = await storage.getCompetitors();
        const competitorNames = competitors.map(c => c.name.toLowerCase());

        // Get all unique platforms from all responses for consistent display
        const allSystemPlatforms = Array.from(new Set(responses.map(r => (r as any).platform).filter(Boolean))).sort();

        // Aggregate metrics per prompt
        const promptMetrics = promptsWithTopics.map(prompt => {
            // Find responses for this prompt
            const promptResponses = responses.filter(r => r.promptId === prompt.id);

            // Filter to responses where brand is mentioned
            const mentionResponses = promptResponses.filter(r => r.brandMentioned);
            const mentions = mentionResponses.length;

            // Track which platforms responded and which mentioned
            const respondedPlatforms = new Set(promptResponses.map(r => (r as any).platform).filter(Boolean));
            const mentionedPlatforms = new Set(mentionResponses.map(r => (r as any).platform).filter(Boolean));

            // Show all system platforms with status
            const platformStatus = allSystemPlatforms.map(p => ({
                platform: p,
                mentioned: mentionedPlatforms.has(p),
                responded: respondedPlatforms.has(p),
            }));

            // Count citations (responses with URLs)
            const citations = promptResponses.filter(r =>
                r.text && (r.text.includes('http://') || r.text.includes('https://'))
            ).length;

            // Find which competitors were mentioned
            const mentionedCompetitors = new Set<string>();
            for (const r of promptResponses) {
                const textLower = r.text?.toLowerCase() || '';
                for (const comp of competitors) {
                    if (textLower.includes(comp.name.toLowerCase())) {
                        mentionedCompetitors.add(comp.name);
                    }
                }
            }
            const competitorsMentioned = Array.from(mentionedCompetitors);

            // Calculate average position (placeholder - would need actual ranking data)
            // For now, use mention count as proxy (more mentions = likely higher position)
            const position = mentions > 0 ? Math.max(1, Math.ceil(5 - (mentions / 2))) : null;

            // Get topic names from topicIds array, fallback to single topicId
            const topicIds = (prompt as any).topicIds ?? (prompt.topicId ? [prompt.topicId] : []);
            const topics = topicIds
                .map((id: number) => topicMap.get(id))
                .filter(Boolean) as string[];

            return {
                id: prompt.id,
                text: prompt.text,
                topics,
                mentions,
                citations,
                position,
                competitorsMentioned,
                journeyStages: prompt.journeyStages ?? [],
                platformStatus,
                createdAt: prompt.createdAt?.toISOString() ?? new Date().toISOString(),
            };
        });

        // Sort by mentions descending and take top N
        const topPrompts = promptMetrics
            .sort((a, b) => b.mentions - a.mentions)
            .slice(0, limitNum);

        res.json({ prompts: topPrompts });
    } catch (error) {
        console.error("Error fetching top prompts:", error);
        res.status(500).json({ error: "Failed to fetch top prompts" });
    }
});

// Get single prompt
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const prompt = await storage.getPromptById(id);
        if (!prompt) return res.status(404).json({ error: "Prompt not found" });

        const topic = prompt.topicId ? await storage.getTopicById(prompt.topicId) : null;
        res.json({ ...prompt, topic });
    } catch (error) {
        console.error("Error fetching prompt:", error);
        res.status(500).json({ error: "Failed to fetch prompt" });
    }
});

// Archive a prompt (soft delete)
router.post("/:id/archive", async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid prompt ID" });

        const { archivePrompt } = await import('../services/prompts');
        const result = await archivePrompt(id);

        if (!result.success) {
            return res.status(result.message.includes('not found') ? 404 : 400).json(result);
        }

        res.json(result);
    } catch (error: any) {
        console.error("Error archiving prompt:", error);
        res.status(500).json({ error: "Failed to archive prompt" });
    }
});

// Restore an archived prompt
router.post("/:id/restore", async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid prompt ID" });

        const { restorePrompt } = await import('../services/prompts');
        const result = await restorePrompt(id);

        if (!result.success) {
            return res.status(result.message.includes('not found') ? 404 : 400).json(result);
        }

        res.json(result);
    } catch (error: any) {
        console.error("Error restoring prompt:", error);
        res.status(500).json({ error: "Failed to restore prompt" });
    }
});

// Get archived prompts
router.get("/archived/list", async (req, res) => {
    try {
        const { getArchivedPrompts } = await import('../services/prompts');
        const prompts = await getArchivedPrompts();
        res.json(prompts);
    } catch (error: any) {
        console.error("Error fetching archived prompts:", error);
        res.status(500).json({ error: "Failed to fetch archived prompts" });
    }
});

// Set journey stage
router.put("/:id/stage", async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid prompt ID" });

        const { stage } = req.body;
        if (!stage) return res.status(400).json({ error: "Journey stage is required" });

        const { setPromptStage } = await import('../services/prompts');
        const prompt = await setPromptStage(id, stage);

        if (!prompt) return res.status(404).json({ error: "Prompt not found" });

        res.json(prompt);
    } catch (error: any) {
        console.error("Error setting journey stage:", error);
        if (error.message.includes('Invalid journey stage')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to set journey stage" });
    }
});

// Auto-classify prompt
router.post("/:id/classify", async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid prompt ID" });

        const { autoClassifyPrompt } = await import('../services/prompts');
        const result = await autoClassifyPrompt(id);

        if (!result) return res.status(404).json({ error: "Prompt not found" });

        res.json(result);
    } catch (error: any) {
        console.error("Error classifying prompt:", error);
        res.status(500).json({ error: "Failed to classify prompt" });
    }
});

// Classify all prompts
router.post("/classify/all", async (_req, res) => {
    try {
        const { autoClassifyUnclassified } = await import('../services/prompts');
        const result = await autoClassifyUnclassified();
        res.json(result);
    } catch (error: any) {
        console.error("Error bulk classifying prompts:", error);
        res.status(500).json({ error: "Failed to classify prompts" });
    }
});

// Get by stage
router.get("/stage/:stage", async (req, res) => {
    try {
        const { stage } = req.params;
        const { getPromptsByStage } = await import('../services/prompts');
        const prompts = await getPromptsByStage(stage as any);
        res.json(prompts);
    } catch (error: any) {
        console.error("Error fetching prompts by stage:", error);
        res.status(500).json({ error: "Failed to fetch prompts" });
    }
});

// Import prompts
router.post("/import", async (req, res) => {
    try {
        const { csv, options } = req.body;

        if (!csv || typeof csv !== 'string') {
            return res.status(400).json({ error: "CSV content is required" });
        }

        const { importPromptsFromCsv } = await import('../services/prompts');
        const result = await importPromptsFromCsv(csv, options || {});

        res.json(result);
    } catch (error: any) {
        console.error("Error importing prompts:", error);
        res.status(500).json({
            error: "Failed to import prompts",
            message: error.message
        });
    }
});

// Generate prompts
router.post("/generate", async (req, res) => {
    try {
        const { brandUrl, competitors, settings } = req.body;

        if (!brandUrl || !competitors || !settings) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const { generateTopicPrompts, suggestBrandTopics } = await import("../services/ai/brand-research");
        const { profileBrandWebsite } = await import("../services/site-intelligence/site-profiler");

        // Get existing topics from database or generate new ones dynamically
        const existingTopics = await storage.getTopics();

        let topics;
        if (existingTopics.length >= settings.numberOfTopics) {
            // Use existing topics
            topics = existingTopics.slice(0, settings.numberOfTopics).map(topic => ({
                name: topic.name,
                description: topic.description || `Questions about ${topic.name.toLowerCase()}`
            }));
        } else {
            const profile = await profileBrandWebsite(brandUrl);
            const newTopics = await suggestBrandTopics(profile, settings.numberOfTopics - existingTopics.length);

            topics = [
                ...existingTopics.map(topic => ({
                    name: topic.name,
                    description: topic.description || `Questions about ${topic.name.toLowerCase()}`
                })),
                ...newTopics
            ];
        }

        // Generate prompts for each topic
        const topicsWithPrompts = [];

        for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            try {
                const prompts = await generateTopicPrompts(
                    topic.name,
                    topic.description,
                    settings.promptsPerTopic,
                    competitors.map((c: any) => c.name)
                );

                topicsWithPrompts.push({
                    name: topic.name,
                    description: topic.description,
                    prompts
                });
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error generating prompts for topic ${topic.name}:`, error);
                // Add empty prompts array to continue with other topics
                topicsWithPrompts.push({
                    name: topic.name,
                    description: topic.description,
                    prompts: []
                });
            }
        }

        res.json({ topics: topicsWithPrompts });
    } catch (error) {
        console.error("Error generating prompts:", error);
        res.status(500).json({ error: "Failed to generate prompts" });
    }
});

// Generate prompts for a specific topic
router.post("/generate-topic", async (req, res) => {
    try {
        const { topicName, topicDescription, competitors, promptCount } = req.body;

        if (!topicName || !topicDescription) {
            return res.status(400).json({ error: "Topic name and description are required" });
        }

        const { generateTopicPrompts } = await import("../services/ai/brand-research");

        const prompts = await generateTopicPrompts(
            topicName,
            topicDescription,
            promptCount || 5,
            competitors ? competitors.map((c: any) => c.name) : []
        );

        res.json({ prompts });
    } catch (error) {
        console.error("Error generating topic prompts:", error);
        res.status(500).json({ error: "Failed to generate topic prompts" });
    }
});

export default router;
