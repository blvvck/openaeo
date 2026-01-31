/**
 * CDN Webhook Receivers
 *
 * Handles incoming bot traffic data from CDN providers:
 * - Cloudflare (Logpush NDJSON format)
 * - Vercel (Drains format)
 * - Netlify (Log Drains NDJSON format)
 *
 * Security Implementation (per Isaac's Stytch webhook security best practices):
 * 1. HMAC signature verification - validates payload authenticity
 * 2. Timestamp validation - rejects webhooks older than 5 minutes
 * 3. Replay attack prevention - timestamp is part of signed payload
 * 4. Secure secret storage - secrets in environment variables
 *
 * Environment Variables Required:
 * - CLOUDFLARE_WEBHOOK_SECRET: Secret token for Cloudflare Logpush auth header
 * - VERCEL_WEBHOOK_SECRET: Secret for Vercel HMAC signature verification
 * - NETLIFY_WEBHOOK_SECRET: Secret for Netlify webhook authentication
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { prismaRoot } from '../../prisma';
import { runInWorkspaceTransaction } from '../../context/workspace-context';
import {
  logBotVisitsBatch,
  classifyBot,
  type BotVisitMetadata,
} from '../../services/bots/traffic-logger';

const router = Router();

function requestError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

async function persistVisitsForWorkspace(req: Request, visits: NormalizedVisit[]) {
  const workspaceId = req.header('x-workspace-id');
  if (!workspaceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
    throw requestError('A valid X-Workspace-Id header is required', 400);
  }
  if (!await prismaRoot.workspaces.findUnique({ where: { id: workspaceId }, select: { id: true } })) {
    throw requestError('Workspace was not found', 404);
  }
  return runInWorkspaceTransaction(prismaRoot, workspaceId, () => logBotVisitsBatch(visits));
}

// =============================================================================
// Security Constants
// =============================================================================

/** Maximum age for webhook timestamps (5 minutes in milliseconds) */
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

/** Clock skew tolerance (60 seconds) */
const CLOCK_SKEW_TOLERANCE_MS = 60 * 1000;

// =============================================================================
// Types
// =============================================================================

interface NormalizedVisit {
  userAgent: string;
  url: string;
  visitedAt: Date;
  metadata?: BotVisitMetadata;
}

interface CloudflareLogEntry {
  ClientRequestUserAgent: string;
  ClientRequestURI: string;
  ClientRequestHost: string;
  EdgeStartTimestamp: string | number;
  EdgeResponseStatus: number;
  EdgeTimeToFirstByteMs: number;
  EdgeResponseContentType?: string;
  EdgeResponseBytes?: number;
  BotScore?: number;
}

interface VercelDrainEntry {
  deploymentId?: string;
  projectId?: string;
  host: string;
  path: string;
  statusCode: number;
  duration: number;
  requestId?: string;
  timestamp: number;
  proxy?: {
    userAgent?: string;
    clientIp?: string;
    region?: string;
  };
}

interface NetlifyLogEntry {
  timestamp: string;
  log_type: string;
  path: string;
  user_agent: string;
  status_code?: number;
  duration?: number;
  client_ip?: string;
}

// =============================================================================
// Security Utilities
// =============================================================================

/**
 * Verify HMAC signature for webhook payload
 *
 * Uses timing-safe comparison to prevent timing attacks.
 * The signature should be computed as HMAC-SHA256(secret, payload).
 */
function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha1' = 'sha256'
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Buffers of different lengths throw - signatures don't match
    return false;
  }
}

/**
 * Validate webhook timestamp to prevent replay attacks
 *
 * Rejects webhooks older than MAX_TIMESTAMP_AGE_MS (5 minutes).
 * Allows for clock skew of CLOCK_SKEW_TOLERANCE_MS (60 seconds).
 */
function validateTimestamp(timestamp: Date | number | string): {
  valid: boolean;
  reason?: string;
} {
  let webhookTime: number;

  if (timestamp instanceof Date) {
    webhookTime = timestamp.getTime();
  } else if (typeof timestamp === 'number') {
    // Handle both seconds and milliseconds
    webhookTime = timestamp > 1e12 ? timestamp : timestamp * 1000;
  } else if (typeof timestamp === 'string') {
    webhookTime = new Date(timestamp).getTime();
  } else {
    return { valid: false, reason: 'Invalid timestamp format' };
  }

  if (isNaN(webhookTime)) {
    return { valid: false, reason: 'Could not parse timestamp' };
  }

  const now = Date.now();
  const age = now - webhookTime;

  // Check if timestamp is in the future (with clock skew tolerance)
  if (webhookTime > now + CLOCK_SKEW_TOLERANCE_MS) {
    return { valid: false, reason: 'Timestamp is in the future' };
  }

  // Check if timestamp is too old
  if (age > MAX_TIMESTAMP_AGE_MS) {
    return {
      valid: false,
      reason: `Timestamp is too old (${Math.round(age / 1000)}s > ${MAX_TIMESTAMP_AGE_MS / 1000}s)`,
    };
  }

  return { valid: true };
}

/**
 * Check if a user agent belongs to a bot
 */
function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const classification = classifyBot(userAgent);
  return classification.category !== 'unknown';
}

/**
 * Parse NDJSON (newline-delimited JSON) payload
 */
function parseNDJSON<T>(body: string | Buffer): T[] {
  const text = typeof body === 'string' ? body : body.toString('utf8');
  const lines = text.split('\n').filter((line) => line.trim());
  const results: T[] = [];

  for (const line of lines) {
    try {
      results.push(JSON.parse(line));
    } catch (e) {
      console.warn('[CDN Webhook] Failed to parse NDJSON line:', line.substring(0, 100));
    }
  }

  return results;
}

// =============================================================================
// Cloudflare Webhook
// =============================================================================

/**
 * POST /api/webhooks/cdn/cloudflare
 *
 * Receives Cloudflare Logpush data in NDJSON format.
 *
 * Authentication: Header token (X-Auth-Token)
 * Cloudflare includes the token in the destination URL config:
 * https://yourapp.com/api/webhooks/cdn/cloudflare?header_X-Auth-Token={secret}
 *
 * Payload format: NDJSON with fields:
 * - ClientRequestUserAgent
 * - ClientRequestURI
 * - ClientRequestHost
 * - EdgeStartTimestamp (RFC3339 or Unix nanoseconds)
 * - EdgeResponseStatus
 * - EdgeTimeToFirstByteMs
 * - EdgeResponseContentType
 * - EdgeResponseBytes
 * - BotScore (optional, 1-99)
 */
router.post('/cloudflare', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ===================
    // 1. Authentication
    // ===================
    const secret = process.env.CLOUDFLARE_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[Cloudflare Webhook] CLOUDFLARE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    // Cloudflare sends token in X-Auth-Token header (configured via URL param)
    const authToken = req.headers['x-auth-token'] as string;
    if (!authToken) {
      console.warn('[Cloudflare Webhook] Missing X-Auth-Token header');
      return res.status(401).json({ error: 'Unauthorized: Missing auth token' });
    }

    // Timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(authToken), Buffer.from(secret))) {
      console.warn('[Cloudflare Webhook] Invalid auth token');
      return res.status(401).json({ error: 'Unauthorized: Invalid auth token' });
    }

    // ===================
    // 2. Parse Payload
    // ===================
    let entries: CloudflareLogEntry[];

    // Handle both raw text/NDJSON and JSON array formats
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      entries = parseNDJSON<CloudflareLogEntry>(req.body);
    } else if (Array.isArray(req.body)) {
      entries = req.body;
    } else {
      // Single entry as JSON object
      entries = [req.body];
    }

    if (entries.length === 0) {
      return res.status(200).json({ received: 0, filtered: 0, stored: 0 });
    }

    // ===================
    // 3. Normalize & Filter
    // ===================
    const visits: NormalizedVisit[] = [];
    let filteredCount = 0;
    let staleCount = 0;

    for (const entry of entries) {
      // Skip non-bot traffic (if BotScore available, use it; otherwise check UA)
      const isBotTraffic =
        (entry.BotScore !== undefined && entry.BotScore < 30) ||
        isBot(entry.ClientRequestUserAgent || '');

      if (!isBotTraffic) {
        filteredCount++;
        continue;
      }

      // Parse timestamp
      let visitedAt: Date;
      if (typeof entry.EdgeStartTimestamp === 'string') {
        visitedAt = new Date(entry.EdgeStartTimestamp);
      } else if (typeof entry.EdgeStartTimestamp === 'number') {
        // Cloudflare may send nanoseconds
        const ts = entry.EdgeStartTimestamp > 1e15
          ? entry.EdgeStartTimestamp / 1e6 // nanoseconds to milliseconds
          : entry.EdgeStartTimestamp > 1e12
          ? entry.EdgeStartTimestamp // already milliseconds
          : entry.EdgeStartTimestamp * 1000; // seconds to milliseconds
        visitedAt = new Date(ts);
      } else {
        visitedAt = new Date();
      }

      // Validate timestamp (replay attack prevention)
      const timestampCheck = validateTimestamp(visitedAt);
      if (!timestampCheck.valid) {
        staleCount++;
        continue;
      }

      visits.push({
        userAgent: entry.ClientRequestUserAgent || '',
        url: `https://${entry.ClientRequestHost}${entry.ClientRequestURI}`,
        visitedAt,
        metadata: {
          statusCode: entry.EdgeResponseStatus,
          responseTimeMs: entry.EdgeTimeToFirstByteMs,
          contentType: entry.EdgeResponseContentType,
          contentLengthBytes: entry.EdgeResponseBytes,
        },
      });
    }

    // ===================
    // 4. Store Bot Visits
    // ===================
    let stored = 0;
    if (visits.length > 0) {
      const saved = await persistVisitsForWorkspace(req, visits);
      stored = saved.length;
    }

    const processingTime = Date.now() - startTime;
    console.info(
      `[Cloudflare Webhook] Processed ${entries.length} entries: ` +
        `${stored} stored, ${filteredCount} filtered (non-bot), ${staleCount} stale. ` +
        `Time: ${processingTime}ms`
    );

    res.status(200).json({
      received: entries.length,
      filtered: filteredCount,
      stale: staleCount,
      stored,
      processingTimeMs: processingTime,
    });
  } catch (error: any) {
    console.error('[Cloudflare Webhook] Error:', error);
    res.status(error.statusCode ?? 500).json({
      error: 'Failed to process webhook',
      message: error.message,
    });
  }
});

// =============================================================================
// Vercel Webhook
// =============================================================================

/**
 * POST /api/webhooks/cdn/vercel
 *
 * Receives Vercel Log Drains data.
 *
 * Authentication: HMAC-SHA256 signature in x-vercel-signature header
 * Signature is computed as: HMAC-SHA256(secret, raw_body)
 *
 * Payload format: JSON with fields:
 * - host
 * - path
 * - statusCode
 * - duration (ms)
 * - timestamp (Unix milliseconds)
 * - proxy.userAgent
 */
router.post('/vercel', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ===================
    // 1. Authentication (HMAC Signature Verification)
    // ===================
    const secret = process.env.VERCEL_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[Vercel Webhook] VERCEL_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const signature = req.headers['x-vercel-signature'] as string;
    if (!signature) {
      console.warn('[Vercel Webhook] Missing x-vercel-signature header');
      return res.status(401).json({ error: 'Unauthorized: Missing signature' });
    }

    // Get raw body for signature verification
    const rawBody = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

    if (!verifyHmacSignature(rawBody, signature, secret, 'sha256')) {
      console.warn('[Vercel Webhook] Invalid signature');
      return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
    }

    // ===================
    // 2. Parse Payload
    // ===================
    let entries: VercelDrainEntry[];

    if (Array.isArray(req.body)) {
      entries = req.body;
    } else if (req.body && typeof req.body === 'object') {
      entries = [req.body];
    } else {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    if (entries.length === 0) {
      return res.status(200).json({ received: 0, filtered: 0, stored: 0 });
    }

    // ===================
    // 3. Normalize & Filter
    // ===================
    const visits: NormalizedVisit[] = [];
    let filteredCount = 0;
    let staleCount = 0;

    for (const entry of entries) {
      const userAgent = entry.proxy?.userAgent || '';

      // Skip non-bot traffic
      if (!isBot(userAgent)) {
        filteredCount++;
        continue;
      }

      // Parse timestamp
      const visitedAt = new Date(entry.timestamp);

      // Validate timestamp (replay attack prevention)
      const timestampCheck = validateTimestamp(visitedAt);
      if (!timestampCheck.valid) {
        staleCount++;
        continue;
      }

      visits.push({
        userAgent,
        url: `https://${entry.host}${entry.path}`,
        visitedAt,
        metadata: {
          statusCode: entry.statusCode,
          responseTimeMs: entry.duration,
          // Vercel drains don't include content-type/length
        },
      });
    }

    // ===================
    // 4. Store Bot Visits
    // ===================
    let stored = 0;
    if (visits.length > 0) {
      const saved = await persistVisitsForWorkspace(req, visits);
      stored = saved.length;
    }

    const processingTime = Date.now() - startTime;
    console.info(
      `[Vercel Webhook] Processed ${entries.length} entries: ` +
        `${stored} stored, ${filteredCount} filtered (non-bot), ${staleCount} stale. ` +
        `Time: ${processingTime}ms`
    );

    res.status(200).json({
      received: entries.length,
      filtered: filteredCount,
      stale: staleCount,
      stored,
      processingTimeMs: processingTime,
    });
  } catch (error: any) {
    console.error('[Vercel Webhook] Error:', error);
    res.status(error.statusCode ?? 500).json({
      error: 'Failed to process webhook',
      message: error.message,
    });
  }
});

// =============================================================================
// Netlify Webhook
// =============================================================================

/**
 * POST /api/webhooks/cdn/netlify
 *
 * Receives Netlify Log Drains data in NDJSON format.
 *
 * Authentication: Bearer token in Authorization header
 * Configure in Netlify: Authorization: Bearer {secret}
 *
 * Payload format: NDJSON with fields:
 * - timestamp (RFC3339)
 * - log_type
 * - path
 * - user_agent
 * - status_code
 * - duration (ms)
 */
router.post('/netlify', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ===================
    // 1. Authentication
    // ===================
    const secret = process.env.NETLIFY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[Netlify Webhook] NETLIFY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const authHeader = req.headers['authorization'] as string;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[Netlify Webhook] Missing or invalid Authorization header');
      return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret))) {
      console.warn('[Netlify Webhook] Invalid auth token');
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // ===================
    // 2. Parse Payload
    // ===================
    let entries: NetlifyLogEntry[];

    // Handle both raw text/NDJSON and JSON array formats
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      entries = parseNDJSON<NetlifyLogEntry>(req.body);
    } else if (Array.isArray(req.body)) {
      entries = req.body;
    } else if (req.body && typeof req.body === 'object') {
      entries = [req.body];
    } else {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    // Filter to traffic logs only
    entries = entries.filter((e) => e.log_type === 'traffic' || !e.log_type);

    if (entries.length === 0) {
      return res.status(200).json({ received: 0, filtered: 0, stored: 0 });
    }

    // ===================
    // 3. Normalize & Filter
    // ===================
    const visits: NormalizedVisit[] = [];
    let filteredCount = 0;
    let staleCount = 0;

    for (const entry of entries) {
      const userAgent = entry.user_agent || '';

      // Skip non-bot traffic
      if (!isBot(userAgent)) {
        filteredCount++;
        continue;
      }

      // Parse timestamp
      const visitedAt = new Date(entry.timestamp);

      // Validate timestamp (replay attack prevention)
      const timestampCheck = validateTimestamp(visitedAt);
      if (!timestampCheck.valid) {
        staleCount++;
        continue;
      }

      visits.push({
        userAgent,
        url: entry.path, // Netlify only sends path, not full URL
        visitedAt,
        metadata: {
          statusCode: entry.status_code,
          responseTimeMs: entry.duration,
          // Netlify drains don't include content-type/length
        },
      });
    }

    // ===================
    // 4. Store Bot Visits
    // ===================
    let stored = 0;
    if (visits.length > 0) {
      const saved = await persistVisitsForWorkspace(req, visits);
      stored = saved.length;
    }

    const processingTime = Date.now() - startTime;
    console.info(
      `[Netlify Webhook] Processed ${entries.length} entries: ` +
        `${stored} stored, ${filteredCount} filtered (non-bot), ${staleCount} stale. ` +
        `Time: ${processingTime}ms`
    );

    res.status(200).json({
      received: entries.length,
      filtered: filteredCount,
      stale: staleCount,
      stored,
      processingTimeMs: processingTime,
    });
  } catch (error: any) {
    console.error('[Netlify Webhook] Error:', error);
    res.status(error.statusCode ?? 500).json({
      error: 'Failed to process webhook',
      message: error.message,
    });
  }
});

// =============================================================================
// Health Check
// =============================================================================

/**
 * GET /api/webhooks/cdn/health
 *
 * Health check endpoint for monitoring webhook receiver status.
 * Returns configuration status without exposing secrets.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    providers: {
      cloudflare: {
        configured: !!process.env.CLOUDFLARE_WEBHOOK_SECRET,
        endpoint: '/api/webhooks/cdn/cloudflare',
      },
      vercel: {
        configured: !!process.env.VERCEL_WEBHOOK_SECRET,
        endpoint: '/api/webhooks/cdn/vercel',
      },
      netlify: {
        configured: !!process.env.NETLIFY_WEBHOOK_SECRET,
        endpoint: '/api/webhooks/cdn/netlify',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
