
// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import promptsRouter from "./prompts";
import { storage } from "../data";
import { runInWorkspace } from "../context/workspace-context";
import { scheduleDuePromptRun } from "../services/prompts/prompt-tracking";
import { insertPromptSchema } from "@shared/schema";

// Mock storage
vi.mock("../data", () => ({
    storage: {
        createPrompt: vi.fn(),
        updatePrompt: vi.fn(),
        getLatestPrompts: vi.fn(),
        getPromptById: vi.fn(),
        getTopicById: vi.fn(),
        getTopics: vi.fn(),
        createTopic: vi.fn(),
    },
}));

// Mock prompt services
vi.mock("../services/prompts", () => ({
    archivePrompt: vi.fn(),
    restorePrompt: vi.fn(),
    getArchivedPrompts: vi.fn(),
    setPromptStage: vi.fn(),
    autoClassifyPrompt: vi.fn(),
    getPromptsByStage: vi.fn(),
    autoClassifyUnclassified: vi.fn(),
    importPromptsFromCsv: vi.fn(),
}));

// Mock OpenAI services
vi.mock("../services/ai/brand-research", () => ({
    generateTopicPrompts: vi.fn(),
    suggestBrandTopics: vi.fn(),
}));
vi.mock("../services/site-intelligence/site-profiler", () => ({
    profileBrandWebsite: vi.fn().mockResolvedValue({
        url: "https://example.com/", domain: "example.com", title: "Example", description: "Example site", text: "Example product website",
    }),
}));

vi.mock("../services/prompts/prompt-tracking", () => ({
    getPromptFrequency: vi.fn().mockResolvedValue("daily"),
    scheduleDuePromptRun: vi.fn(),
    queueDuePromptRun: vi.fn(),
    getNextPromptRunAt: vi.fn(),
    updatePromptFrequency: vi.fn(),
    PROMPT_FREQUENCIES: ["daily", "7d", "14d", "30d"],
}));

const app = express();
app.use(express.json());
app.use((_req, _res, next) => runInWorkspace("workspace-test", next));
app.use("/api/prompts", promptsRouter);

describe("PROMPTS Routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("POST /api/prompts", () => {
        it("should create a new prompt", async () => {
            const mockPrompt = { id: 1, text: "Test Prompt", topicId: 1 };
            (storage.createPrompt as any).mockResolvedValue(mockPrompt);

            const res = await request(app)
                .post("/api/prompts")
                .send({ text: "Test Prompt", topicId: 1 });

            expect(res.status).toBe(201);
            expect(res.body).toEqual({ ...mockPrompt, trackingQueued: true, frequency: "daily" });
            expect(storage.createPrompt).toHaveBeenCalledWith({ text: "Test Prompt", topicId: 1 });
            expect(scheduleDuePromptRun).toHaveBeenCalledWith("workspace-test", [1]);
        });

        it("should return 400 for invalid input", async () => {
            const res = await request(app)
                .post("/api/prompts")
                .send({ text: "" }); // Invalid: too short/empty

            expect(res.status).toBe(400);
        });
    });

    describe("PATCH /api/prompts/:id", () => {
        it("should update an existing prompt", async () => {
            const mockUpdatedPrompt = { id: 1, text: "Updated Prompt", topicId: 1 };
            (storage.updatePrompt as any).mockResolvedValue(mockUpdatedPrompt);

            const res = await request(app)
                .patch("/api/prompts/1")
                .send({ text: "Updated Prompt" });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockUpdatedPrompt);
            expect(storage.updatePrompt).toHaveBeenCalledWith(1, { text: "Updated Prompt" });
        });

        it("should return 404 if prompt not found", async () => {
            (storage.updatePrompt as any).mockResolvedValue(undefined);

            const res = await request(app)
                .patch("/api/prompts/999")
                .send({ text: "Updated Prompt" });

            expect(res.status).toBe(404);
        });
    });

    describe("GET /api/prompts", () => {
        it("should return all prompts enriched with topics", async () => {
            const mockPrompts = [{ id: 1, text: "P1", topicId: 10 }];
            const mockTopic = { id: 10, name: "T1" };

            (storage.getLatestPrompts as any).mockResolvedValue(mockPrompts);
            (storage.getTopicById as any).mockResolvedValue(mockTopic);

            const res = await request(app).get("/api/prompts");

            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ ...mockPrompts[0], topic: mockTopic }]);
        });
    });

    describe("GET /api/prompts/:id", () => {
        it("should return a single prompt enriched with topic", async () => {
            const mockPrompt = { id: 1, text: "P1", topicId: 10 };
            const mockTopic = { id: 10, name: "T1" };

            (storage.getPromptById as any).mockResolvedValue(mockPrompt);
            (storage.getTopicById as any).mockResolvedValue(mockTopic);

            const res = await request(app).get("/api/prompts/1");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ...mockPrompt, topic: mockTopic });
        });

        it("should return 404 if not found", async () => {
            (storage.getPromptById as any).mockResolvedValue(null);
            const res = await request(app).get("/api/prompts/999");
            expect(res.status).toBe(404);
        });
    });

    describe("POST /api/prompts/generate", () => {
        it("should generate prompts", async () => {
            const { generateTopicPrompts, suggestBrandTopics } = await import("../services/ai/brand-research");

            const mockSettings = { numberOfTopics: 1, promptsPerTopic: 2 };
            const mockTopics = [{ name: "Topic1", description: "Desc1" }];
            const mockPrompts = ["Q1", "Q2"];

            (storage.getTopics as any).mockResolvedValue([]);
            (suggestBrandTopics as any).mockResolvedValue(mockTopics);
            (generateTopicPrompts as any).mockResolvedValue(mockPrompts);

            const res = await request(app)
                .post("/api/prompts/generate")
                .send({
                    brandUrl: "https://example.com",
                    competitors: [],
                    settings: mockSettings
                });

            expect(res.status).toBe(200);
            expect(res.body.topics).toHaveLength(1);
            expect(res.body.topics[0].prompts).toEqual(mockPrompts);
        });
    });
});
