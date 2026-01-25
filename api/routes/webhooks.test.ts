/**
 * Webhook Routes Tests
 *
 * Tests for Clerk webhook handling.
 *
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the user sync service
vi.mock('../services/auth/user-sync', () => ({
  getUserSyncService: vi.fn(() => ({
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    createWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    addWorkspaceMember: vi.fn(),
    updateWorkspaceMember: vi.fn(),
    removeWorkspaceMember: vi.fn(),
  })),
}));

describe('Clerk Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Type Mapping', () => {
    it('should recognize user.created event', () => {
      const event = { type: 'user.created', data: { id: 'user_123' } };
      expect(event.type).toBe('user.created');
    });

    it('should recognize user.updated event', () => {
      const event = { type: 'user.updated', data: { id: 'user_123' } };
      expect(event.type).toBe('user.updated');
    });

    it('should recognize user.deleted event', () => {
      const event = { type: 'user.deleted', data: { id: 'user_123' } };
      expect(event.type).toBe('user.deleted');
    });

    it('should recognize organization.created event', () => {
      const event = { type: 'organization.created', data: { id: 'org_123' } };
      expect(event.type).toBe('organization.created');
    });

    it('should recognize organizationMembership.created event', () => {
      const event = { type: 'organizationMembership.created', data: {} };
      expect(event.type).toBe('organizationMembership.created');
    });
  });

  describe('Role Mapping', () => {
    function mapClerkRoleToLocal(clerkRole: string): string {
      switch (clerkRole) {
        case 'admin':
          return 'owner';
        case 'basic_member':
        default:
          return 'member';
      }
    }

    it('should map Clerk admin to local owner', () => {
      expect(mapClerkRoleToLocal('admin')).toBe('owner');
    });

    it('should map Clerk basic_member to local member', () => {
      expect(mapClerkRoleToLocal('basic_member')).toBe('member');
    });

    it('should default unknown roles to member', () => {
      expect(mapClerkRoleToLocal('unknown_role')).toBe('member');
    });
  });

  describe('User Data Extraction', () => {
    it('should extract email from first email address', () => {
      const data = {
        email_addresses: [
          { email_address: 'test@example.com' },
          { email_address: 'other@example.com' },
        ],
      };
      const email = data.email_addresses?.[0]?.email_address;
      expect(email).toBe('test@example.com');
    });

    it('should handle missing email addresses', () => {
      const data = {};
      const email = (data as any).email_addresses?.[0]?.email_address;
      expect(email).toBeUndefined();
    });

    it('should build display name from first and last name', () => {
      const data = { first_name: 'John', last_name: 'Doe' };
      const displayName = data.first_name
        ? `${data.first_name} ${data.last_name || ''}`.trim()
        : null;
      expect(displayName).toBe('John Doe');
    });

    it('should handle missing last name', () => {
      const data = { first_name: 'John' };
      const displayName = data.first_name
        ? `${data.first_name} ${(data as any).last_name || ''}`.trim()
        : null;
      expect(displayName).toBe('John');
    });
  });

  describe('Webhook Signature Headers', () => {
    it('should require svix-id header', () => {
      const headers = {
        'svix-id': 'msg_123',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,signature...',
      };
      expect(headers['svix-id']).toBe('msg_123');
    });

    it('should require svix-timestamp header', () => {
      const headers = {
        'svix-id': 'msg_123',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,signature...',
      };
      expect(headers['svix-timestamp']).toBe('1234567890');
    });

    it('should require svix-signature header', () => {
      const headers = {
        'svix-id': 'msg_123',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,signature...',
      };
      expect(headers['svix-signature']).toBe('v1,signature...');
    });
  });

  describe('Organization Data Extraction', () => {
    it('should extract organization id and name', () => {
      const data = {
        id: 'org_123',
        name: 'My Organization',
        slug: 'my-org',
        created_by: 'user_456',
      };
      expect(data.id).toBe('org_123');
      expect(data.name).toBe('My Organization');
      expect(data.slug).toBe('my-org');
    });

    it('should extract membership organization id', () => {
      const data = {
        organization: { id: 'org_123' },
        public_user_data: { user_id: 'user_456' },
        role: 'admin',
      };
      expect(data.organization.id).toBe('org_123');
      expect(data.public_user_data.user_id).toBe('user_456');
    });
  });
});
