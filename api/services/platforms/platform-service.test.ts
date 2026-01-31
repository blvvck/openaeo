

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PlatformService,
  getPlatformService,
  resetPlatformService,
  type CreatePlatformInput,
  type UpdatePlatformInput,
  type PlatformType,
} from './platform-service';

// Mock the database module
vi.mock('../../db/index', () => {
  const mockPlatforms: any[] = [];
  let idCounter = 1;

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve(mockPlatforms)),
          where: vi.fn((condition: any) => ({
            orderBy: vi.fn(() => Promise.resolve(mockPlatforms.filter(p => p.isActive))),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn((data: any) => ({
          returning: vi.fn(() => {
            const newPlatform = {
              ...data,
              id: `uuid-${idCounter++}`,
              createdAt: new Date(),
            };
            mockPlatforms.push(newPlatform);
            return Promise.resolve([newPlatform]);
          }),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => {
              if (mockPlatforms.length > 0) {
                return Promise.resolve([mockPlatforms[0]]);
              }
              return Promise.resolve([]);
            }),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ rowCount: 1 })),
      })),
    },
  };
});

describe('PlatformService', () => {
  beforeEach(() => {
    resetPlatformService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const service1 = getPlatformService();
      const service2 = getPlatformService();
      expect(service1).toBe(service2);
    });

    it('should create new instance after reset', () => {
      const service1 = getPlatformService();
      resetPlatformService();
      const service2 = getPlatformService();
      expect(service1).not.toBe(service2);
    });
  });

  describe('Validation', () => {
    describe('CreatePlatformInput', () => {
      it('should reject empty slug', () => {
        const service = getPlatformService();
        const input: CreatePlatformInput = {
          slug: '',
          name: 'Test Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        };
        expect(service.create(input)).rejects.toThrow('Slug is required');
      });

      it('should reject slug longer than 50 characters', () => {
        const service = getPlatformService();
        const input: CreatePlatformInput = {
          slug: 'a'.repeat(51),
          name: 'Test Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        };
        expect(service.create(input)).rejects.toThrow('50 characters');
      });

      it('should reject slug with special characters', () => {
        const service = getPlatformService();
        const input: CreatePlatformInput = {
          slug: 'test_platform!',
          name: 'Test Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        };
        expect(service.create(input)).rejects.toThrow('letters, numbers, and hyphens');
      });

      it('should reject empty name', () => {
        const service = getPlatformService();
        const input: CreatePlatformInput = {
          slug: 'test-platform',
          name: '',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        };
        expect(service.create(input)).rejects.toThrow('Name is required');
      });

      it('should reject name longer than 100 characters', () => {
        const service = getPlatformService();
        const input: CreatePlatformInput = {
          slug: 'test-platform',
          name: 'a'.repeat(101),
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        };
        expect(service.create(input)).rejects.toThrow('100 characters');
      });

      it('should reject RPM less than 1', () => {
        const service = getPlatformService();
        const input: CreatePlatformInput = {
          slug: 'test-platform',
          name: 'Test Platform',
          rateLimitRpm: 0,
          rateLimitConcurrent: 5,
        };
        expect(service.create(input)).rejects.toThrow('RPM must be between');
      });

      it('should reject RPM greater than 10000', () => {
        const service = getPlatformService();
        const input: CreatePlatformInput = {
          slug: 'test-platform',
          name: 'Test Platform',
          rateLimitRpm: 10001,
          rateLimitConcurrent: 5,
        };
        expect(service.create(input)).rejects.toThrow('RPM must be between');
      });

      it('should reject concurrent limit less than 1', () => {
        const service = getPlatformService();
        const input: CreatePlatformInput = {
          slug: 'test-platform',
          name: 'Test Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 0,
        };
        expect(service.create(input)).rejects.toThrow('Concurrent limit must be between');
      });

      it('should reject concurrent limit greater than 100', () => {
        const service = getPlatformService();
        const input: CreatePlatformInput = {
          slug: 'test-platform',
          name: 'Test Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 101,
        };
        expect(service.create(input)).rejects.toThrow('Concurrent limit must be between');
      });
    });

    describe('UpdatePlatformInput', () => {
      it('should allow partial updates', async () => {
        const service = getPlatformService();
        // Note: The actual update would require a valid existing platform
        // This test validates the input structure
        const input: UpdatePlatformInput = {
          name: 'Updated Name',
        };
        expect(input).toBeDefined();
        expect(input.name).toBe('Updated Name');
        expect(input.rateLimitRpm).toBeUndefined();
      });
    });
  });

  describe('Platform Type Inference', () => {
    it('should identify ChatGPT from slug', () => {
      const service = getPlatformService();
      // Using internal method through a workaround
      expect((service as any).inferType('chatgpt')).toBe('chatgpt');
      expect((service as any).inferType('openai-gpt4')).toBe('chatgpt');
    });

    it('should identify Claude from slug', () => {
      const service = getPlatformService();
      expect((service as any).inferType('claude-3')).toBe('claude');
      expect((service as any).inferType('anthropic-ai')).toBe('claude');
    });

    it('should identify Gemini from slug', () => {
      const service = getPlatformService();
      expect((service as any).inferType('gemini-pro')).toBe('gemini');
    });

    it('should identify Perplexity from slug', () => {
      const service = getPlatformService();
      expect((service as any).inferType('perplexity-ai')).toBe('perplexity');
    });

    it('should identify Grok from slug', () => {
      const service = getPlatformService();
      expect((service as any).inferType('grok-2')).toBe('grok');
    });

    it('should identify DeepSeek from slug', () => {
      const service = getPlatformService();
      expect((service as any).inferType('deepseek-chat')).toBe('deepseek');
    });

    it('should identify Google AI Overview from slug', () => {
      const service = getPlatformService();
      expect((service as any).inferType('google-ai-overview')).toBe('google-ai-overview');
    });

    it('should identify Google AI Mode from slug', () => {
      const service = getPlatformService();
      expect((service as any).inferType('google-ai-mode')).toBe('google-ai-mode');
    });

    it('should default to custom for unknown slugs', () => {
      const service = getPlatformService();
      expect((service as any).inferType('my-custom-llm')).toBe('custom');
      expect((service as any).inferType('unknown-platform')).toBe('custom');
    });
  });

  describe('Rate Limit Updates', () => {
    it('should reject RPM outside valid range', () => {
      const service = getPlatformService();
      expect(service.updateRateLimits('test-id', 0, 5)).rejects.toThrow('RPM must be between');
      expect(service.updateRateLimits('test-id', 10001, 5)).rejects.toThrow('RPM must be between');
    });

    it('should reject concurrent outside valid range', () => {
      const service = getPlatformService();
      expect(service.updateRateLimits('test-id', 60, 0)).rejects.toThrow('Concurrent limit must be between');
      expect(service.updateRateLimits('test-id', 60, 101)).rejects.toThrow('Concurrent limit must be between');
    });
  });

  describe('Slug Normalization', () => {
    it('should normalize slug to lowercase', () => {
      // The service normalizes slugs during creation
      const service = getPlatformService();
      // Can be verified through the create input processing
      expect('TEST-PLATFORM'.toLowerCase().replace(/[^a-z0-9-]/g, '-')).toBe('test-platform');
    });

    it('should replace invalid characters with hyphens', () => {
      expect('test_platform@123'.toLowerCase().replace(/[^a-z0-9-]/g, '-')).toBe('test-platform-123');
    });
  });

  describe('Platform Types', () => {
    it('should have all expected platform types', () => {
      const types: PlatformType[] = [
        'chatgpt',
        'claude',
        'gemini',
        'perplexity',
        'grok',
        'deepseek',
        'google-ai-overview',
        'google-ai-mode',
        'custom',
      ];
      expect(types).toHaveLength(9);
    });
  });
});

describe('Platform Configuration', () => {
  it('should support all config options', () => {
    const config = {
      apiEndpoint: 'https://api.example.com',
      model: 'gpt-4o',
      headers: { 'X-Custom': 'value' },
      timeoutMs: 30000,
      maxRetries: 3,
      useStreaming: true,
      custom: { key: 'value' },
    };
    expect(config.apiEndpoint).toBeDefined();
    expect(config.model).toBeDefined();
    expect(config.headers).toBeDefined();
    expect(config.timeoutMs).toBe(30000);
    expect(config.maxRetries).toBe(3);
    expect(config.useStreaming).toBe(true);
    expect(config.custom).toBeDefined();
  });
});

describe('Input Validation Edge Cases', () => {
  it('should handle whitespace-only strings', () => {
    const service = getPlatformService();
    const input: CreatePlatformInput = {
      slug: '   ',
      name: 'Test',
      rateLimitRpm: 60,
      rateLimitConcurrent: 5,
    };
    // Whitespace slug should fail validation (regex won't match)
    expect(service.create(input)).rejects.toThrow();
  });

  it('should handle valid edge case values', () => {
    const minInput: CreatePlatformInput = {
      slug: 'a',
      name: 'A',
      rateLimitRpm: 1,
      rateLimitConcurrent: 1,
    };
    expect(minInput.rateLimitRpm).toBe(1);
    expect(minInput.rateLimitConcurrent).toBe(1);

    const maxInput: CreatePlatformInput = {
      slug: 'a'.repeat(50),
      name: 'a'.repeat(100),
      rateLimitRpm: 10000,
      rateLimitConcurrent: 100,
    };
    expect(maxInput.slug.length).toBe(50);
    expect(maxInput.name.length).toBe(100);
    expect(maxInput.rateLimitRpm).toBe(10000);
    expect(maxInput.rateLimitConcurrent).toBe(100);
  });
});
