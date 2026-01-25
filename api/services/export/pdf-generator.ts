/**
 * PDF Report Generator
 *
 * Generates branded PDF reports with metrics, charts, and analysis data.
 */

import PDFDocument from 'pdfkit';
import { storage } from '../../data';
import { getSimpleSentiment } from '../analytics/sentiment-analyzer';

/** Report section options */
export interface ReportSections {
  overview?: boolean;
  visibility?: boolean;
  competitors?: boolean;
  topics?: boolean;
  sources?: boolean;
  responses?: boolean;
  recommendations?: boolean;
}

/** PDF generation options */
export interface PDFGeneratorOptions {
  title?: string;
  brandName?: string;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  sections?: ReportSections;
}

/** Default sections */
const DEFAULT_SECTIONS: ReportSections = {
  overview: true,
  visibility: true,
  competitors: true,
  topics: true,
  sources: true,
  responses: false,
  recommendations: true,
};

/** Color palette */
const COLORS = {
  primary: '#3B82F6',
  secondary: '#64748B',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
};

/**
 * Generate a PDF report
 */
export async function generatePDFReport(options: PDFGeneratorOptions = {}): Promise<Buffer> {
  const {
    title = 'LLM Brand Visibility Report',
    brandName = 'Your Brand',
    dateRangeStart,
    dateRangeEnd,
    sections = DEFAULT_SECTIONS,
  } = options;

  // Fetch data
  const responses = await storage.getResponses();
  const prompts = await storage.getPrompts();
  const competitors = await storage.getCompetitors();
  const sources = await storage.getSources();
  const topics = await storage.getTopics();

  // Filter by date range if provided
  let filteredResponses = responses;
  if (dateRangeStart || dateRangeEnd) {
    filteredResponses = responses.filter(r => {
      if (!r.createdAt) return true;
      const date = new Date(r.createdAt);
      if (dateRangeStart && date < dateRangeStart) return false;
      if (dateRangeEnd && date > dateRangeEnd) return false;
      return true;
    });
  }

  // Create PDF document
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: title,
      Author: 'OpenAEO',
      Subject: 'Brand Visibility Analysis',
      CreationDate: new Date(),
    },
  });

  // Collect PDF chunks
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // Return promise that resolves when PDF is complete
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const result = Buffer.concat(chunks);
      resolve(result);
    });
    doc.on('error', reject);

    try {
      // Title page
      renderTitlePage(doc, title, brandName, dateRangeStart, dateRangeEnd);

      // Overview section
      if (sections.overview) {
        doc.addPage();
        renderOverviewSection(doc, filteredResponses, prompts.length, competitors.length);
      }

      // Visibility section
      if (sections.visibility) {
        doc.addPage();
        renderVisibilitySection(doc, filteredResponses);
      }

      // Competitors section
      if (sections.competitors && competitors.length > 0) {
        doc.addPage();
        renderCompetitorsSection(doc, competitors, filteredResponses);
      }

      // Topics section
      if (sections.topics && topics.length > 0) {
        doc.addPage();
        renderTopicsSection(doc, topics, prompts, filteredResponses);
      }

      // Sources section
      if (sections.sources && sources.length > 0) {
        doc.addPage();
        renderSourcesSection(doc, sources);
      }

      // Responses section
      if (sections.responses && filteredResponses.length > 0) {
        doc.addPage();
        renderResponsesSection(doc, filteredResponses.slice(0, 20));
      }

      // Recommendations section
      if (sections.recommendations) {
        doc.addPage();
        renderRecommendationsSection(doc, filteredResponses, competitors);
      }

      // Footer on each page
      addFooters(doc);

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Render title page
 */
function renderTitlePage(
  doc: PDFKit.PDFDocument,
  title: string,
  brandName: string,
  dateRangeStart?: Date,
  dateRangeEnd?: Date
): void {
  // Title
  doc.fontSize(28)
    .fillColor(COLORS.primary)
    .text(title, { align: 'center' });

  doc.moveDown(2);

  // Brand name
  doc.fontSize(20)
    .fillColor(COLORS.text)
    .text(`Brand: ${brandName}`, { align: 'center' });

  doc.moveDown(1);

  // Date range
  const dateText = formatDateRange(dateRangeStart, dateRangeEnd);
  doc.fontSize(14)
    .fillColor(COLORS.textLight)
    .text(dateText, { align: 'center' });

  doc.moveDown(4);

  // Generated date
  doc.fontSize(12)
    .fillColor(COLORS.textLight)
    .text(`Generated: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`, { align: 'center' });
}

/**
 * Render overview section
 */
function renderOverviewSection(
  doc: PDFKit.PDFDocument,
  responses: typeof storage extends { getResponses(): Promise<infer R> } ? Awaited<R> : never[],
  promptCount: number,
  competitorCount: number
): void {
  renderSectionHeader(doc, 'Overview');

  const brandMentions = responses.filter((r: any) => r.brandMentioned).length;
  const mentionRate = responses.length > 0 ? (brandMentions / responses.length) * 100 : 0;

  // Calculate average sentiment
  let avgSentiment = 0;
  if (responses.length > 0) {
    let sentimentSum = 0;
    for (let i = 0; i < responses.length; i++) {
      const result = getSimpleSentiment((responses[i] as any).text || '');
      sentimentSum += result.score;
    }
    avgSentiment = sentimentSum / responses.length;
  }

  // Metrics grid
  const metrics = [
    { label: 'Total Responses', value: responses.length.toString() },
    { label: 'Brand Mentions', value: brandMentions.toString() },
    { label: 'Mention Rate', value: `${mentionRate.toFixed(1)}%` },
    { label: 'Prompts Tracked', value: promptCount.toString() },
    { label: 'Competitors', value: competitorCount.toString() },
    { label: 'Avg Sentiment', value: formatSentiment(avgSentiment) },
  ];

  renderMetricsGrid(doc, metrics);
}

/**
 * Render visibility section
 */
function renderVisibilitySection(
  doc: PDFKit.PDFDocument,
  responses: any[]
): void {
  renderSectionHeader(doc, 'Brand Visibility');

  const brandMentions = responses.filter((r: any) => r.brandMentioned).length;
  const mentionRate = responses.length > 0 ? (brandMentions / responses.length) * 100 : 0;

  doc.fontSize(12)
    .fillColor(COLORS.text)
    .text(`Your brand was mentioned in ${brandMentions} out of ${responses.length} AI responses.`);

  doc.moveDown(1);

  // Visibility score visualization (text-based)
  doc.fontSize(14)
    .fillColor(COLORS.text)
    .text('Visibility Score:');

  const scoreColor = mentionRate >= 70 ? COLORS.success : mentionRate >= 40 ? COLORS.warning : COLORS.danger;
  doc.fontSize(36)
    .fillColor(scoreColor)
    .text(`${mentionRate.toFixed(0)}%`, { align: 'left' });

  doc.moveDown(1);

  // Score interpretation
  doc.fontSize(11)
    .fillColor(COLORS.textLight);

  if (mentionRate >= 70) {
    doc.text('Excellent visibility! Your brand is well-represented in AI responses.');
  } else if (mentionRate >= 40) {
    doc.text('Moderate visibility. There is room for improvement in AI representation.');
  } else {
    doc.text('Low visibility. Consider optimizing your content for AI discovery.');
  }
}

/**
 * Render competitors section
 */
function renderCompetitorsSection(
  doc: PDFKit.PDFDocument,
  competitors: any[],
  responses: any[]
): void {
  renderSectionHeader(doc, 'Competitor Analysis');

  // Sort by mention count
  const sorted = competitors
    .slice()
    .sort((a: any, b: any) => (b.mentionCount || 0) - (a.mentionCount || 0));

  const top10 = sorted.slice(0, 10);

  doc.fontSize(12)
    .fillColor(COLORS.text)
    .text('Top Competitors by Mention Count:');

  doc.moveDown(0.5);

  // Table headers
  const startY = doc.y;
  const colWidths = [200, 100, 100];

  doc.fontSize(10)
    .fillColor(COLORS.textLight)
    .text('Competitor', 50, startY)
    .text('Mentions', 250, startY)
    .text('Category', 350, startY);

  doc.moveTo(50, startY + 15)
    .lineTo(450, startY + 15)
    .strokeColor(COLORS.border)
    .stroke();

  let y = startY + 25;

  for (let i = 0; i < top10.length; i++) {
    const comp = top10[i];
    doc.fontSize(10)
      .fillColor(COLORS.text)
      .text(comp.name || 'Unknown', 50, y)
      .text((comp.mentionCount || 0).toString(), 250, y)
      .text(comp.category || '-', 350, y);
    y += 20;
  }
}

/**
 * Render topics section
 */
function renderTopicsSection(
  doc: PDFKit.PDFDocument,
  topics: any[],
  prompts: any[],
  responses: any[]
): void {
  renderSectionHeader(doc, 'Topic Analysis');

  doc.fontSize(12)
    .fillColor(COLORS.text)
    .text(`Analyzing ${topics.length} topics across ${prompts.length} prompts.`);

  doc.moveDown(1);

  // Topic list with prompt counts
  const topicData = topics.map((topic: any) => {
    const topicPrompts = prompts.filter((p: any) => p.topicId === topic.id);
    return {
      name: topic.name,
      promptCount: topicPrompts.length,
    };
  }).sort((a, b) => b.promptCount - a.promptCount);

  const startY = doc.y;

  doc.fontSize(10)
    .fillColor(COLORS.textLight)
    .text('Topic', 50, startY)
    .text('Prompts', 350, startY);

  doc.moveTo(50, startY + 15)
    .lineTo(450, startY + 15)
    .strokeColor(COLORS.border)
    .stroke();

  let y = startY + 25;

  const topicsToShow = topicData.slice(0, 15);
  for (let i = 0; i < topicsToShow.length; i++) {
    const topic = topicsToShow[i];
    doc.fontSize(10)
      .fillColor(COLORS.text)
      .text(topic.name, 50, y, { width: 280 })
      .text(topic.promptCount.toString(), 350, y);
    y += 20;
  }
}

/**
 * Render sources section
 */
function renderSourcesSection(doc: PDFKit.PDFDocument, sources: any[]): void {
  renderSectionHeader(doc, 'Citation Sources');

  // Sort by citation count
  const sorted = sources
    .slice()
    .sort((a: any, b: any) => (b.citationCount || 0) - (a.citationCount || 0));

  const top15 = sorted.slice(0, 15);

  doc.fontSize(12)
    .fillColor(COLORS.text)
    .text(`Top ${top15.length} most-cited domains in AI responses:`);

  doc.moveDown(1);

  const startY = doc.y;

  doc.fontSize(10)
    .fillColor(COLORS.textLight)
    .text('Domain', 50, startY)
    .text('Citations', 350, startY);

  doc.moveTo(50, startY + 15)
    .lineTo(450, startY + 15)
    .strokeColor(COLORS.border)
    .stroke();

  let y = startY + 25;

  for (let i = 0; i < top15.length; i++) {
    const source = top15[i];
    doc.fontSize(10)
      .fillColor(COLORS.text)
      .text(source.domain, 50, y, { width: 280 })
      .text((source.citationCount || 0).toString(), 350, y);
    y += 20;
  }
}

/**
 * Render responses section (sample)
 */
function renderResponsesSection(doc: PDFKit.PDFDocument, responses: any[]): void {
  renderSectionHeader(doc, 'Sample Responses');

  doc.fontSize(11)
    .fillColor(COLORS.textLight)
    .text(`Showing ${responses.length} recent AI responses:`);

  doc.moveDown(1);

  for (let i = 0; i < Math.min(responses.length, 5); i++) {
    const response = responses[i];
    const mentioned = response.brandMentioned ? 'Yes' : 'No';
    const sentiment = getSimpleSentiment(response.text || '');

    doc.fontSize(10)
      .fillColor(COLORS.primary)
      .text(`Response ${i + 1}`, { continued: true })
      .fillColor(COLORS.textLight)
      .text(` | Brand Mentioned: ${mentioned} | Sentiment: ${sentiment.label}`);

    doc.fontSize(9)
      .fillColor(COLORS.text)
      .text((response.text || '').slice(0, 300) + (response.text?.length > 300 ? '...' : ''));

    doc.moveDown(1);
  }
}

/**
 * Render recommendations section
 */
function renderRecommendationsSection(
  doc: PDFKit.PDFDocument,
  responses: any[],
  competitors: any[]
): void {
  renderSectionHeader(doc, 'Recommendations');

  const brandMentions = responses.filter((r: any) => r.brandMentioned).length;
  const mentionRate = responses.length > 0 ? (brandMentions / responses.length) * 100 : 0;

  const recommendations: string[] = [];

  // Generate recommendations based on data
  if (mentionRate < 30) {
    recommendations.push('Critical: Your brand visibility is low. Focus on creating more authoritative content that AI systems can reference.');
    recommendations.push('Consider implementing structured data (JSON-LD) on your website to help AI systems understand your brand.');
  } else if (mentionRate < 60) {
    recommendations.push('Your brand has moderate visibility. Focus on expanding your presence across more topics.');
    recommendations.push('Create comprehensive, well-structured content that directly answers common questions in your industry.');
  }

  if (competitors.length > 0) {
    const topCompetitor = competitors.reduce((max: any, c: any) =>
      (c.mentionCount || 0) > (max.mentionCount || 0) ? c : max, competitors[0]);

    if ((topCompetitor.mentionCount || 0) > brandMentions) {
      recommendations.push(`Your top competitor "${topCompetitor.name}" has more mentions. Analyze their content strategy for insights.`);
    }
  }

  recommendations.push('Regularly monitor AI responses to track changes in brand visibility over time.');
  recommendations.push('Ensure your website is accessible to AI crawlers (check robots.txt for GPTBot, ClaudeBot, etc.).');

  doc.fontSize(12)
    .fillColor(COLORS.text);

  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    doc.text(`${i + 1}. ${rec}`);
    doc.moveDown(0.5);
  }
}

/**
 * Render section header
 */
function renderSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc.fontSize(18)
    .fillColor(COLORS.primary)
    .text(title);

  doc.moveTo(50, doc.y + 5)
    .lineTo(545, doc.y + 5)
    .strokeColor(COLORS.primary)
    .lineWidth(2)
    .stroke();

  doc.moveDown(1);
}

/**
 * Render metrics grid
 */
function renderMetricsGrid(
  doc: PDFKit.PDFDocument,
  metrics: Array<{ label: string; value: string }>
): void {
  const startX = 50;
  const startY = doc.y;
  const boxWidth = 160;
  const boxHeight = 60;
  const cols = 3;

  for (let i = 0; i < metrics.length; i++) {
    const metric = metrics[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * boxWidth;
    const y = startY + row * (boxHeight + 10);

    // Box background
    doc.rect(x, y, boxWidth - 10, boxHeight)
      .fillColor(COLORS.background)
      .fill();

    // Value
    doc.fontSize(20)
      .fillColor(COLORS.text)
      .text(metric.value, x + 10, y + 10, { width: boxWidth - 20 });

    // Label
    doc.fontSize(10)
      .fillColor(COLORS.textLight)
      .text(metric.label, x + 10, y + 38, { width: boxWidth - 20 });
  }

  doc.y = startY + Math.ceil(metrics.length / cols) * (boxHeight + 10) + 20;
}

/**
 * Add footers to all pages
 */
function addFooters(doc: PDFKit.PDFDocument): void {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);

    // Footer text
    doc.fontSize(8)
      .fillColor(COLORS.textLight)
      .text(
        `Page ${i + 1} of ${pages.count} | Generated by OpenAEO`,
        50,
        doc.page.height - 40,
        { align: 'center', width: doc.page.width - 100 }
      );
  }
}

/**
 * Format date range for display
 */
function formatDateRange(start?: Date, end?: Date): string {
  if (start && end) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (start) {
    return `From ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (end) {
    return `Until ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return 'All Time';
}

/**
 * Format sentiment score for display
 */
function formatSentiment(score: number): string {
  if (score > 0.1) return `+${(score * 100).toFixed(0)}%`;
  if (score < -0.1) return `${(score * 100).toFixed(0)}%`;
  return 'Neutral';
}
