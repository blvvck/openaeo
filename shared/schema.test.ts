import { describe, expect, it } from 'vitest';
import { insertAlertChannelSchema, insertAlertRuleSchema, insertPromptSchema, insertResponseSchema, ROLE_PERMISSIONS } from './schema';

describe('Prisma-backed request schemas', () => {
  it('accepts a prompt with tenant-safe editable fields', () => {
    expect(insertPromptSchema.safeParse({ text: 'What is OpenAEO?', topicIds: [1, 2] }).success).toBe(true);
  });

  it('rejects an empty prompt', () => {
    expect(insertPromptSchema.safeParse({ text: '' }).success).toBe(false);
  });

  it('validates responses', () => {
    expect(insertResponseSchema.safeParse({ promptId: 4, text: 'A useful response' }).success).toBe(true);
    expect(insertResponseSchema.safeParse({ promptId: 4, text: '' }).success).toBe(false);
  });

  it('validates alert rules and channel configuration', () => {
    expect(insertAlertRuleSchema.safeParse({ name: 'Visibility', type: 'visibility_drop', threshold: 10 }).success).toBe(true);
    expect(insertAlertChannelSchema.safeParse({ name: 'Email', type: 'email', config: { address: 'team@example.com' } }).success).toBe(true);
    expect(insertAlertChannelSchema.safeParse({ name: 'Email', type: 'email', config: 'invalid' }).success).toBe(false);
  });

  it('keeps workspace permissions available to route authorization', () => {
    expect(ROLE_PERMISSIONS.owner).toContain('*');
    expect(ROLE_PERMISSIONS.viewer).toContain('data:read');
  });
});
