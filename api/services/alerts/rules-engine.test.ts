/**
 * Rules Engine Tests
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AlertRulesEngine } from './rules-engine';
import { storage } from '../../data';
import { prisma } from '../../prisma';
import { runInWorkspace } from '../../context/workspace-context';

// Mock dependencies
vi.mock('../../data', () => ({
    storage: {
        getResponses: vi.fn(),
        getCompetitors: vi.fn(),
    },
}));

vi.mock('../../prisma', () => ({
    prisma: {
        alert_rules: {
            create: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));

// Mock Data Helpers
const mockRule = (overrides = {}) => ({
    id: 1,
    name: 'Test Rule',
    type: 'visibility_drop',
    threshold: 10,
    timeWindowHours: 24,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastTriggeredAt: null,
    ...overrides,
});

const mockResponse = (overrides = {}) => ({
    id: 1,
    platform: 'chatgpt',
    text: 'Test response regarding Acme.',
    brandMentioned: true,
    competitorsMentioned: [],
    sentimentScore: 0.8,
    createdAt: new Date(),
    ...overrides,
});

describe('AlertRulesEngine', () => {
    let engine: AlertRulesEngine;

    beforeEach(() => {
        vi.clearAllMocks();
        engine = AlertRulesEngine.getInstance();
    });

    describe('evaluateVisibilityDrop', () => {
        it('triggers when visibility drops below threshold', async () => {
            const rule = mockRule({
                type: 'visibility_drop',
                threshold: 10, // 10% drop threshold
                timeWindowHours: 24
            });

            // Mock responses: 
            // Previous window: 100% visibility (2/2)
            // Current window: 50% visibility (1/2)
            // Drop: 50% (triggers > 10%)

            const now = Date.now();
            const hour = 3600000;

            const responses = [
                // Current window (last 24h)
                mockResponse({ createdAt: new Date(now - 1 * hour), brandMentioned: true }),
                mockResponse({ createdAt: new Date(now - 2 * hour), brandMentioned: false }),

                // Previous window (24h-48h ago)
                mockResponse({ createdAt: new Date(now - 25 * hour), brandMentioned: true }),
                mockResponse({ createdAt: new Date(now - 26 * hour), brandMentioned: true }),
            ];

            vi.mocked(storage.getResponses).mockResolvedValue(responses as any);

            const result = await engine.evaluateRule(rule as any);

            expect(result.triggered).toBe(true);
            expect(result.ruleType).toBe('visibility_drop');
            expect(result.previousValue).toBe(100);
            expect(result.currentValue).toBe(50);
            expect(result.changePercent).toBe(-50);
        });

        it('does not trigger when drop is within threshold', async () => {
            const rule = mockRule({
                type: 'visibility_drop',
                threshold: 20,
            });

            // Drop 10% (100 -> 90)
            const now = Date.now();
            const hour = 3600000;

            const responses = [
                // Current: 9/10 mentions (90%)
                ...Array(9).fill(null).map((_, i) => mockResponse({ createdAt: new Date(now - i * hour), brandMentioned: true })),
                mockResponse({ createdAt: new Date(now - 10 * hour), brandMentioned: false }),

                // Previous: 10/10 mentions (100%)
                ...Array(10).fill(null).map((_, i) => mockResponse({ createdAt: new Date(now - 25 * hour - i * hour), brandMentioned: true })),
            ];

            vi.mocked(storage.getResponses).mockResolvedValue(responses as any);

            const result = await engine.evaluateRule(rule as any);

            expect(result.triggered).toBe(false);
            expect(result.changePercent).toBe(-10);
        });
    });

    describe('evaluateBrandRemoval', () => {
        it('triggers when brand is removed (0 mentions)', async () => {
            const rule = mockRule({
                type: 'brand_removal',
                threshold: 5, // Triggers if 0 mentions in last 5 responses
            });

            const now = Date.now();
            const responses = Array(5).fill(null).map((_, i) =>
                mockResponse({ createdAt: new Date(now - i * 1000), brandMentioned: false })
            );

            vi.mocked(storage.getResponses).mockResolvedValue(responses as any);

            const result = await engine.evaluateRule(rule as any);

            expect(result.triggered).toBe(true);
            expect(result.ruleType).toBe('brand_removal');
            expect(result.currentValue).toBe(0); // 0 mentions
            expect(result.previousValue).toBe(5); // 5 total responses
        });

        it('does not trigger if brand is mentioned once', async () => {
            const rule = mockRule({
                type: 'brand_removal',
                threshold: 5,
            });

            const now = Date.now();
            const responses = [
                mockResponse({ createdAt: new Date(now), brandMentioned: true }),
                ...Array(4).fill(null).map((_, i) =>
                    mockResponse({ createdAt: new Date(now - (i + 1) * 1000), brandMentioned: false })
                ),
            ];

            vi.mocked(storage.getResponses).mockResolvedValue(responses as any);

            const result = await engine.evaluateRule(rule as any);

            expect(result.triggered).toBe(false);
        });
    });

    describe('evaluateCompetitorSurge', () => {
        it('triggers when competitor mentions surge', async () => {
            const rule = mockRule({
                type: 'competitor_surge',
                threshold: 50, // > 50% increase
            });

            // Mock competitors
            vi.mocked(storage.getCompetitors).mockResolvedValue([{ name: 'CompA' }] as any);

            const now = Date.now();
            const hour = 3600000;

            const responses = [
                // Current: 4 mentions
                ...Array(4).fill(null).map((_, i) =>
                    mockResponse({ createdAt: new Date(now - i * hour), competitorsMentioned: ['CompA'] })
                ),

                // Previous: 2 mentions
                ...Array(2).fill(null).map((_, i) =>
                    mockResponse({ createdAt: new Date(now - 25 * hour - i * hour), competitorsMentioned: ['CompA'] })
                ),
            ];

            vi.mocked(storage.getResponses).mockResolvedValue(responses as any);

            const result = await engine.evaluateRule(rule as any);

            expect(result.triggered).toBe(true);
            expect(result.ruleType).toBe('competitor_surge');
            expect(result.currentValue).toBe(4);
            expect(result.previousValue).toBe(2);
            expect(result.changePercent).toBe(100); // 100% increase
        });
    });

    describe('evaluateSentimentShift', () => {
        it('triggers when sentiment shifts significantly', async () => {
            // NOTE: Sentiment score comes from text analysis in getSimpleSentiment
            // We need to ensure the text produces the desired score or mock getSimpleSentiment if possible.
            // Since getSimpleSentiment is imported, let's trust the text helper or just mock the sentiment response if engine calculation uses stored values.
            // Wait, engine uses `getSimpleSentiment(resps[i].text)` inside the loop! 
            // We should probably rely on a simple text wrapper around `getSimpleSentiment` or provide text that works.

            // Since we can't easily mock `getSimpleSentiment` here (it's a direct import in SUT), 
            // we'll provide text that we know produces positive/negative sentiment based on previous tests.

            const rule = mockRule({
                type: 'sentiment_shift',
                threshold: 50, // shift > 0.5 (since threshold is used as checks)
            });

            const now = Date.now();
            const hour = 3600000;

            const responses = [
                // Current window: Negative ('terrible')
                mockResponse({ createdAt: new Date(now - 1 * hour), text: 'This is terrible and awful.' }),

                // Previous window: Positive ('excellent')
                mockResponse({ createdAt: new Date(now - 25 * hour), text: 'This is excellent and amazing.' }),
            ];

            vi.mocked(storage.getResponses).mockResolvedValue(responses as any);

            const result = await engine.evaluateRule(rule as any);

            // excellent -> ~0.9
            // terrible -> ~-0.9
            // change -> ~-1.8
            // abs(change) * 100 -> ~180 > 50

            expect(result.triggered).toBe(true);
            expect(result.ruleType).toBe('sentiment_shift');
            expect(Math.abs(result.changePercent)).toBeGreaterThan(50);
        });
    });

    describe('CRUD Operations', () => {
        it('createRule inserts into db', async () => {
            const mockRule = {
                id: 1,
                name: 'New Rule',
                workspace_id: 'workspace-test',
            };
            vi.mocked(prisma.alert_rules.create).mockResolvedValue(mockRule as any);

            const result = await runInWorkspace('workspace-test', () =>
                engine.createRule({ name: 'New Rule' } as any),
            );
            expect(result).toEqual({ id: 1, name: 'New Rule', workspaceId: 'workspace-test' });
            expect(prisma.alert_rules.create).toHaveBeenCalledWith({
                data: { name: 'New Rule', workspace_id: 'workspace-test' },
            });
        });

        it('getRules selects from db', async () => {
            vi.mocked(prisma.alert_rules.findMany).mockResolvedValue([]);

            await runInWorkspace('workspace-test', () => engine.getRules());
            expect(prisma.alert_rules.findMany).toHaveBeenCalledWith({
                where: { workspace_id: 'workspace-test' },
                orderBy: { created_at: 'desc' },
            });
        });
    });
});
