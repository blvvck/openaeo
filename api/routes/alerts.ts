/**
 * Alerts API Routes
 *
 * CRUD endpoints for alert rules and channels, plus testing and history.
 */

import { Router, Request, Response } from 'express';
import {
  getAlertRulesEngine,
  getAlertDeliveryService,
  type AlertRuleType,
} from '../services/alerts';

const router = Router();

// =====================================================
// Alert Rules Endpoints
// =====================================================

/**
 * GET /api/alerts/rules
 * Get all alert rules
 */
router.get('/rules', async (_req: Request, res: Response) => {
  try {
    const engine = getAlertRulesEngine();
    const rules = await engine.getRules();
    res.json(rules);
  } catch (error) {
    console.error('[Alerts API] Error getting rules:', error);
    res.status(500).json({ error: 'Failed to get alert rules' });
  }
});

/**
 * GET /api/alerts/rules/:id
 * Get a specific alert rule
 */
router.get('/rules/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const engine = getAlertRulesEngine();
    const rule = await engine.getRuleById(id);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(rule);
  } catch (error) {
    console.error('[Alerts API] Error getting rule:', error);
    res.status(500).json({ error: 'Failed to get alert rule' });
  }
});

/**
 * POST /api/alerts/rules
 * Create a new alert rule
 */
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const validTypes: AlertRuleType[] = ['visibility_drop', 'brand_removal', 'competitor_surge', 'sentiment_shift'];

    const { name, type, threshold, timeWindowHours, enabled, description } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid rule type',
        validTypes,
      });
    }

    if (typeof threshold !== 'number' || threshold <= 0) {
      return res.status(400).json({ error: 'Threshold must be a positive number' });
    }

    const engine = getAlertRulesEngine();
    const rule = await engine.createRule({
      name,
      type,
      threshold,
      timeWindowHours: timeWindowHours || 24,
      enabled: enabled !== false,
      description: description || null,
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('[Alerts API] Error creating rule:', error);
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

/**
 * PATCH /api/alerts/rules/:id
 * Update an alert rule
 */
router.patch('/rules/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const engine = getAlertRulesEngine();
    const existing = await engine.getRuleById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const { name, type, threshold, timeWindowHours, enabled, description } = req.body;
    const updates: Partial<{ name: string; type: string; threshold: number; timeWindowHours: number; enabled: boolean; description: string | null }> = {};

    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (threshold !== undefined) updates.threshold = threshold;
    if (timeWindowHours !== undefined) updates.timeWindowHours = timeWindowHours;
    if (enabled !== undefined) updates.enabled = enabled;
    if (description !== undefined) updates.description = description;

    const rule = await engine.updateRule(id, updates);
    res.json(rule);
  } catch (error) {
    console.error('[Alerts API] Error updating rule:', error);
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

/**
 * DELETE /api/alerts/rules/:id
 * Delete an alert rule
 */
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const engine = getAlertRulesEngine();
    const deleted = await engine.deleteRule(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    console.error('[Alerts API] Error deleting rule:', error);
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

/**
 * POST /api/alerts/rules/:id/toggle
 * Toggle rule enabled status
 */
router.post('/rules/:id/toggle', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const engine = getAlertRulesEngine();
    const rule = await engine.toggleRule(id, enabled);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(rule);
  } catch (error) {
    console.error('[Alerts API] Error toggling rule:', error);
    res.status(500).json({ error: 'Failed to toggle alert rule' });
  }
});

/**
 * POST /api/alerts/rules/:id/evaluate
 * Evaluate a specific rule
 */
router.post('/rules/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const engine = getAlertRulesEngine();
    const rule = await engine.getRuleById(id);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const result = await engine.evaluateRule(rule);
    res.json(result);
  } catch (error) {
    console.error('[Alerts API] Error evaluating rule:', error);
    res.status(500).json({ error: 'Failed to evaluate alert rule' });
  }
});

/**
 * POST /api/alerts/evaluate
 * Evaluate all enabled rules
 */
router.post('/evaluate', async (_req: Request, res: Response) => {
  try {
    const engine = getAlertRulesEngine();
    const results = await engine.runEvaluation();
    res.json({
      results,
      triggered: results.filter(r => r.triggered),
      summary: {
        total: results.length,
        triggered: results.filter(r => r.triggered).length,
      },
    });
  } catch (error) {
    console.error('[Alerts API] Error evaluating rules:', error);
    res.status(500).json({ error: 'Failed to evaluate alert rules' });
  }
});

// =====================================================
// Alert Channels Endpoints
// =====================================================

/**
 * GET /api/alerts/channels
 * Get all alert channels
 */
router.get('/channels', async (_req: Request, res: Response) => {
  try {
    const delivery = getAlertDeliveryService();
    const channels = await delivery.getChannels();
    res.json(channels);
  } catch (error) {
    console.error('[Alerts API] Error getting channels:', error);
    res.status(500).json({ error: 'Failed to get alert channels' });
  }
});

/**
 * GET /api/alerts/channels/:id
 * Get a specific channel
 */
router.get('/channels/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid channel ID' });
    }

    const delivery = getAlertDeliveryService();
    const channel = await delivery.getChannelById(id);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json(channel);
  } catch (error) {
    console.error('[Alerts API] Error getting channel:', error);
    res.status(500).json({ error: 'Failed to get alert channel' });
  }
});

/**
 * POST /api/alerts/channels
 * Create a new alert channel
 */
router.post('/channels', async (req: Request, res: Response) => {
  try {
    const validTypes = ['email', 'slack', 'webhook'];
    const { name, type, config, enabled } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid channel type',
        validTypes,
      });
    }

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Config is required' });
    }

    const delivery = getAlertDeliveryService();
    const channel = await delivery.createChannel({
      name,
      type,
      config,
      enabled: enabled !== false,
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error('[Alerts API] Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create alert channel' });
  }
});

/**
 * PATCH /api/alerts/channels/:id
 * Update an alert channel
 */
router.patch('/channels/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid channel ID' });
    }

    const delivery = getAlertDeliveryService();
    const existing = await delivery.getChannelById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const { name, type, config, enabled } = req.body;
    const updates: Partial<{ name: string; type: string; config: Record<string, unknown>; enabled: boolean }> = {};

    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (config !== undefined) updates.config = config;
    if (enabled !== undefined) updates.enabled = enabled;

    const channel = await delivery.updateChannel(id, updates);
    res.json(channel);
  } catch (error) {
    console.error('[Alerts API] Error updating channel:', error);
    res.status(500).json({ error: 'Failed to update alert channel' });
  }
});

/**
 * DELETE /api/alerts/channels/:id
 * Delete an alert channel
 */
router.delete('/channels/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid channel ID' });
    }

    const delivery = getAlertDeliveryService();
    const deleted = await delivery.deleteChannel(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({ success: true, message: 'Channel deleted' });
  } catch (error) {
    console.error('[Alerts API] Error deleting channel:', error);
    res.status(500).json({ error: 'Failed to delete alert channel' });
  }
});

/**
 * POST /api/alerts/channels/:id/toggle
 * Toggle channel enabled status
 */
router.post('/channels/:id/toggle', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid channel ID' });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const delivery = getAlertDeliveryService();
    const channel = await delivery.toggleChannel(id, enabled);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json(channel);
  } catch (error) {
    console.error('[Alerts API] Error toggling channel:', error);
    res.status(500).json({ error: 'Failed to toggle alert channel' });
  }
});

/**
 * POST /api/alerts/channels/:id/test
 * Test a channel by sending a test alert
 */
router.post('/channels/:id/test', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid channel ID' });
    }

    const delivery = getAlertDeliveryService();
    const result = await delivery.testChannel(id);

    res.json(result);
  } catch (error) {
    console.error('[Alerts API] Error testing channel:', error);
    res.status(500).json({ error: 'Failed to test alert channel' });
  }
});

// =====================================================
// Alert History Endpoints
// =====================================================

/**
 * GET /api/alerts/history
 * Get alert history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const engine = getAlertRulesEngine();
    const history = await engine.getAlertHistory(limit);

    res.json(history);
  } catch (error) {
    console.error('[Alerts API] Error getting history:', error);
    res.status(500).json({ error: 'Failed to get alert history' });
  }
});

/**
 * GET /api/alerts/history/rule/:ruleId
 * Get alert history for a specific rule
 */
router.get('/history/rule/:ruleId', async (req: Request, res: Response) => {
  try {
    const ruleId = parseInt(req.params.ruleId, 10);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;

    const engine = getAlertRulesEngine();
    const history = await engine.getAlertHistoryByRule(ruleId, limit);

    res.json(history);
  } catch (error) {
    console.error('[Alerts API] Error getting rule history:', error);
    res.status(500).json({ error: 'Failed to get alert history for rule' });
  }
});


router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 5;

    const engine = getAlertRulesEngine();
    const history = await engine.getAlertHistory(limit);
    const rules = await engine.getRules();

    // Create a map of rule IDs to rules for quick lookup
    const rulesMap = new Map(rules.map(r => [r.id, r]));

    // Transform to dashboard alert format
    const alerts = history.map(h => {
      const rule = rulesMap.get(h.ruleId || 0);
      return {
        id: String(h.id),
        ruleId: String(h.ruleId || 0),
        ruleName: rule?.name || 'Unknown Rule',
        type: rule?.type || 'visibility_drop',
        severity: determineSeverity(h.data),
        message: h.message,
        triggeredAt: h.triggeredAt?.toISOString() || new Date().toISOString(),
        read: h.status === 'sent',
        data: h.data || {},
      };
    });

    const hasMore = history.length >= limit;

    res.json({
      alerts,
      hasMore,
    });
  } catch (error) {
    console.error('[Alerts API] Error getting recent alerts:', error);
    res.status(500).json({ error: 'Failed to get recent alerts' });
  }
});

/**
 * Determine alert severity based on data
 */
function determineSeverity(data: unknown): 'info' | 'warning' | 'critical' {
  if (!data || typeof data !== 'object') return 'info';

  const d = data as Record<string, unknown>;
  const changePercent = d.changePercent as number | undefined;

  if (changePercent !== undefined) {
    if (Math.abs(changePercent) > 30) return 'critical';
    if (Math.abs(changePercent) > 15) return 'warning';
  }

  return 'info';
}

/**
 * GET /api/alerts/types
 * Get available alert rule types
 */
router.get('/types', (_req: Request, res: Response) => {
  res.json({
    types: [
      {
        type: 'visibility_drop',
        name: 'Visibility Drop',
        description: 'Triggers when visibility score drops by more than the threshold percentage',
        defaultThreshold: 10,
      },
      {
        type: 'brand_removal',
        name: 'Brand Removal',
        description: 'Triggers when brand is not mentioned in recent responses',
        defaultThreshold: 5,
      },
      {
        type: 'competitor_surge',
        name: 'Competitor Surge',
        description: 'Triggers when competitor mentions increase by more than the threshold percentage',
        defaultThreshold: 20,
      },
      {
        type: 'sentiment_shift',
        name: 'Sentiment Shift',
        description: 'Triggers when average sentiment shifts significantly',
        defaultThreshold: 15,
      },
    ],
    channelTypes: ['email', 'slack', 'webhook'],
  });
});

export default router;
