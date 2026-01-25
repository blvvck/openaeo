/**
 * Utility Routes
 *
 * Miscellaneous helper endpoints (domain validation, etc.)
 */

import { Router } from 'express';
import dns from 'dns/promises';

const router = Router();

/**
 * GET /api/utils/validate-domain?domain=example.com
 *
 * Validates that a domain exists by performing DNS lookup.
 * Returns { valid: true/false, error?: string }
 */
router.get('/validate-domain', async (req, res) => {
  try {
    const { domain } = req.query;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        valid: false,
        error: 'Domain parameter is required'
      });
    }

    // Clean the domain - strip protocol, www, and paths
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .toLowerCase()
      .trim();

    // Basic format validation first
    const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return res.json({
        valid: false,
        error: 'Invalid domain format',
        domain: cleanDomain
      });
    }

    // DNS lookup to verify domain exists
    try {
      await dns.resolve(cleanDomain);
      return res.json({
        valid: true,
        domain: cleanDomain
      });
    } catch (dnsError: any) {
      // Common DNS error codes
      if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
        return res.json({
          valid: false,
          error: 'Domain does not exist',
          domain: cleanDomain
        });
      }
      if (dnsError.code === 'ETIMEOUT') {
        return res.json({
          valid: false,
          error: 'DNS lookup timed out',
          domain: cleanDomain
        });
      }
      // For other DNS errors, assume domain might be valid but unreachable
      console.warn(`DNS lookup warning for ${cleanDomain}:`, dnsError.code);
      return res.json({
        valid: true,
        warning: 'Could not verify domain, but format is valid',
        domain: cleanDomain
      });
    }
  } catch (error) {
    console.error('Error validating domain:', error);
    res.status(500).json({
      valid: false,
      error: 'Failed to validate domain'
    });
  }
});

export default router;
