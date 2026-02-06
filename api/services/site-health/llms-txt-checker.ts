/**
 * llms.txt Checker Service
 *
 * Fetches and validates a site's /llms.txt file.
 * Checks for proper Markdown format and required sections.
 */

import type { LlmsTxtStatus } from '@shared/types/site-health';
import { assertPublicDomain, fetchPublicText } from './domain-guard';

/**
 * Check a domain's llms.txt file
 */
export async function checkLlmsTxt(domain: string): Promise<LlmsTxtStatus> {
  const safeDomain = await assertPublicDomain(domain);
  const url = `https://${safeDomain}/llms.txt`;
  const issues: string[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetchPublicText(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OpenAEO-Bot/1.0',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        exists: false,
        url: null,
        valid: false,
        sizeBytes: null,
        hasTitle: false,
        sections: [],
        issues: ['llms.txt file not found at ' + url],
      };
    }

    const text = response.text;
    const sizeBytes = new TextEncoder().encode(text).length;

    // Validate the content
    const lines = text.split('\n');
    const sections: string[] = [];
    let hasTitle = false;

    // Check for H1 title (# Title)
    for (const line of lines) {
      if (line.startsWith('# ')) {
        hasTitle = true;
        break;
      }
    }

    if (!hasTitle) {
      issues.push('Missing H1 title (should start with "# ")');
    }

    // Find H2 sections
    for (const line of lines) {
      if (line.startsWith('## ')) {
        sections.push(line.slice(3).trim());
      }
    }

    // Check file size
    if (sizeBytes > 50000) {
      issues.push('File is too large (> 50KB). Consider using llms-full.txt for extended content.');
    } else if (sizeBytes > 10000) {
      issues.push('File is large (> 10KB). Optimal size is under 10KB.');
    }

    // Check for basic structure
    if (text.trim().length < 100) {
      issues.push('File content is very short. Consider adding more documentation.');
    }

    // Check for summary/description
    const hasDescription = lines.some(line =>
      line.startsWith('>') || // Blockquote description
      (line.trim().length > 50 && !line.startsWith('#') && !line.startsWith('-'))
    );

    if (!hasDescription) {
      issues.push('Missing description. Add a brief summary of your site.');
    }

    // Check for links
    const hasLinks = text.includes('](') || text.includes('](/');
    if (!hasLinks) {
      issues.push('No links found. Add links to important pages.');
    }

    return {
      exists: true,
      url,
      valid: hasTitle && issues.length === 0,
      sizeBytes,
      hasTitle,
      sections,
      issues,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        exists: false,
        url,
        valid: false,
        sizeBytes: null,
        hasTitle: false,
        sections: [],
        issues: ['Request timed out while fetching llms.txt'],
      };
    }

    return {
      exists: false,
      url,
      valid: false,
      sizeBytes: null,
      hasTitle: false,
      sections: [],
      issues: [`Failed to fetch llms.txt: ${error.message}`],
    };
  }
}

/**
 * Generate a starter llms.txt file for a domain
 */
export function generateStarterLlmsTxt(
  brandName: string,
  description: string,
  pages: { path: string; title: string; description: string }[]
): string {
  const lines: string[] = [
    `# ${brandName}`,
    '',
    `> ${description}`,
    '',
  ];

  if (pages.length > 0) {
    // Group pages by category if possible
    const docs = pages.filter(p => p.path.includes('/docs') || p.path.includes('/api'));
    const content = pages.filter(p =>
      p.path.includes('/blog') || p.path.includes('/guide') || p.path.includes('/tutorial')
    );
    const other = pages.filter(p => !docs.includes(p) && !content.includes(p));

    if (docs.length > 0) {
      lines.push('## Documentation');
      for (const page of docs) {
        lines.push(`- [${page.title}](${page.path}): ${page.description}`);
      }
      lines.push('');
    }

    if (content.length > 0) {
      lines.push('## Content');
      for (const page of content) {
        lines.push(`- [${page.title}](${page.path}): ${page.description}`);
      }
      lines.push('');
    }

    if (other.length > 0) {
      lines.push('## Other');
      for (const page of other) {
        lines.push(`- [${page.title}](${page.path}): ${page.description}`);
      }
      lines.push('');
    }
  } else {
    lines.push('## Core Pages');
    lines.push('- [Home](/): Main landing page');
    lines.push('- [About](/about): About our company');
    lines.push('- [Products](/products): Our product offerings');
    lines.push('');
    lines.push('## Optional');
    lines.push('- [Blog](/blog): Latest updates and articles');
    lines.push('');
  }

  return lines.join('\n');
}
