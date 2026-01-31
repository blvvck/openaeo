/**
 * Webhook Routes
 *
 * Handles incoming webhooks from Clerk for user/organization sync.
 */

import { Router, Request, Response } from 'express';
import { Webhook, WebhookRequiredHeaders } from 'svix';
import { getUserSyncService } from '../services/auth/user-sync';

const router = Router();

// Clerk webhook types
type ClerkWebhookEvent = {
  type: string;
  data: Record<string, any>;
  object: string;
};

// Environment variables
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

/**
 * Verify Clerk webhook signature using svix
 */
function verifyClerkWebhook(
  payload: string,
  headers: {
    'svix-id'?: string;
    'svix-timestamp'?: string;
    'svix-signature'?: string;
  }
): ClerkWebhookEvent | null {
  if (!CLERK_WEBHOOK_SECRET) {
    console.error('[Webhook] CLERK_WEBHOOK_SECRET not configured');
    return null;
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  try {
    const verified = wh.verify(payload, {
      'svix-id': headers['svix-id'] || '',
      'svix-timestamp': headers['svix-timestamp'] || '',
      'svix-signature': headers['svix-signature'] || '',
    } as WebhookRequiredHeaders);
    return verified as ClerkWebhookEvent;
  } catch (error) {
    console.error('[Webhook] Verification failed:', error);
    return null;
  }
}

/**
 * POST /api/webhooks/clerk
 *
 * Handles Clerk webhooks for user and organization events.
 * Verifies signature before processing.
 *
 * Event types:
 * - user.created: Create new user record
 * - user.updated: Update user record
 * - user.deleted: Soft delete user
 * - organization.created: Create workspace
 * - organizationMembership.created: Add member to workspace
 * - organizationMembership.updated: Update member role
 * - organizationMembership.deleted: Remove member from workspace
 */
router.post('/clerk', async (req: Request, res: Response) => {
  try {
    // Get raw body for signature verification
    const payload = JSON.stringify(req.body);
    const headers = {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    };

    // In development, allow skipping verification
    let event: ClerkWebhookEvent;
    if (process.env.NODE_ENV === 'development' && !CLERK_WEBHOOK_SECRET) {
      console.warn('[Webhook] Skipping verification in development');
      event = req.body as ClerkWebhookEvent;
    } else {
      const verified = verifyClerkWebhook(payload, headers);
      if (!verified) {
        return res.status(401).json({ error: 'Webhook verification failed' });
      }
      event = verified;
    }

    const userSync = getUserSyncService();
    const { type, data } = event;

    console.log(`[Webhook] Processing ${type}`);

    switch (type) {
      // User events
      case 'user.created':
        await userSync.createUser({
          id: data.id,
          email: data.email_addresses?.[0]?.email_address,
          displayName: data.first_name
            ? `${data.first_name} ${data.last_name || ''}`.trim()
            : null,
          avatarUrl: data.image_url,
        });
        break;

      case 'user.updated':
        await userSync.updateUser(data.id, {
          email: data.email_addresses?.[0]?.email_address,
          displayName: data.first_name
            ? `${data.first_name} ${data.last_name || ''}`.trim()
            : null,
          avatarUrl: data.image_url,
        });
        break;

      case 'user.deleted':
        await userSync.deleteUser(data.id);
        break;

      // Organization events (mapped to workspaces)
      case 'organization.created':
        await userSync.createWorkspace({
          clerkOrgId: data.id,
          name: data.name,
          slug: data.slug,
          createdByUserId: data.created_by,
        });
        break;

      case 'organization.updated':
        await userSync.updateWorkspace(data.id, {
          name: data.name,
          slug: data.slug,
        });
        break;

      case 'organization.deleted':
        await userSync.deleteWorkspace(data.id);
        break;

      // Membership events
      case 'organizationMembership.created':
        await userSync.addWorkspaceMember({
          clerkOrgId: data.organization.id,
          userId: data.public_user_data.user_id,
          role: mapClerkRoleToLocal(data.role),
        });
        break;

      case 'organizationMembership.updated':
        await userSync.updateWorkspaceMember({
          clerkOrgId: data.organization.id,
          userId: data.public_user_data.user_id,
          role: mapClerkRoleToLocal(data.role),
        });
        break;

      case 'organizationMembership.deleted':
        await userSync.removeWorkspaceMember({
          clerkOrgId: data.organization.id,
          userId: data.public_user_data.user_id,
        });
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Map Clerk organization role to local role
 */
function mapClerkRoleToLocal(clerkRole: string): 'owner' | 'admin' | 'member' | 'viewer' {
  switch (clerkRole) {
    case 'admin':
      return 'owner'; // Clerk admin = our owner
    case 'basic_member':
    default:
      return 'member';
  }
}

export default router;
