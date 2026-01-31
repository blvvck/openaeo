/**
 * Variant Manager Service
 *
 * Handles A/B testing for prompt variants including:
 * - CRUD operations for prompt variants
 * - Performance tracking and comparison
 * - Winner determination and promotion
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId } from "../../prisma-mapping";
import type { PromptVariant, VariantPerformance } from "../../../shared/schema";

/**
 * Minimum samples required to determine a winner
 */
export const MIN_SAMPLES_FOR_WINNER = 5;

/**
 * Minimum improvement percentage to declare a winner
 */
export const MIN_IMPROVEMENT_PERCENT = 10;

/**
 * Variant with performance data
 */
export interface VariantWithPerformance extends PromptVariant {
  performance: VariantPerformance | null;
}

/**
 * Comparison result for variants
 */
export interface VariantComparison {
  variants: {
    id: number;
    label: string;
    text: string;
    isControl: boolean;
    isWinner: boolean;
    performance: {
      avgVisibility: number;
      avgPosition: number;
      avgMentions: number;
      sampleSize: number;
    };
  }[];
  winner: string | null;
  insights: string[];
}

/**
 * Variant Manager class
 */
export class VariantManager {
  /**
   * Create a new variant for a prompt
   */
  async create(
    basePromptId: number,
    text: string,
    isControl: boolean = false
  ): Promise<PromptVariant> {
    // Verify base prompt exists
    const workspace_id = requireWorkspaceId();
    const basePrompt = await prisma.prompts.findFirst({ where: { id: basePromptId, workspace_id } });
    if (!basePrompt) {
      throw new Error('Base prompt not found');
    }

    // Get next label (A, B, C, etc.)
    const existingVariants = await this.getVariants(basePromptId);
    const label = String.fromCharCode(65 + existingVariants.length); // A=65

    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('Variant text is required');
    }

    const variant = await prisma.prompt_variants.create({
      data: { workspace_id, base_prompt_id: basePromptId, variant_label: label, text: trimmedText, is_control: isControl },
    });
    return fromPrismaRow<PromptVariant>(variant as unknown as Record<string, unknown>);
  }

  /**
   * Get all variants for a base prompt
   */
  async getVariants(basePromptId: number): Promise<PromptVariant[]> {
    const rows = await prisma.prompt_variants.findMany({
      where: { base_prompt_id: basePromptId, workspace_id: requireWorkspaceId() }, orderBy: { variant_label: "asc" },
    });
    return rows.map((row) => fromPrismaRow<PromptVariant>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get a variant by ID
   */
  async getById(id: number): Promise<PromptVariant | null> {
    const variant = await prisma.prompt_variants.findFirst({ where: { id, workspace_id: requireWorkspaceId() } });
    return variant ? fromPrismaRow<PromptVariant>(variant as unknown as Record<string, unknown>) : null;
  }

  /**
   * Get variants with performance data
   */
  async getVariantsWithPerformance(basePromptId: number): Promise<VariantWithPerformance[]> {
    const variants = await this.getVariants(basePromptId);

    const variantsWithPerf: VariantWithPerformance[] = [];

    for (const variant of variants) {
      const perf = await prisma.variant_performance.findFirst({
        where: { variant_id: variant.id, workspace_id: requireWorkspaceId() },
      });

      variantsWithPerf.push({
        ...variant,
        performance: perf ? fromPrismaRow<VariantPerformance>(perf as unknown as Record<string, unknown>) : null,
      });
    }

    return variantsWithPerf;
  }

  /**
   * Update variant text
   */
  async update(id: number, text: string): Promise<PromptVariant | null> {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('Variant text is required');
    }

    const result = await prisma.prompt_variants.updateMany({
      where: { id, workspace_id: requireWorkspaceId() }, data: { text: trimmedText },
    });
    return result.count ? this.getById(id) : null;
  }

  /**
   * Delete a variant
   */
  async delete(id: number): Promise<boolean> {
    // Performance data will be cascade deleted
    const result = await prisma.prompt_variants.deleteMany({ where: { id, workspace_id: requireWorkspaceId() } });
    return result.count > 0;
  }

  /**
   * Update performance metrics for a variant
   */
  async updatePerformance(
    variantId: number,
    metrics: {
      avgVisibility: number;
      avgPosition: number;
      avgMentions: number;
      sampleSize: number;
    }
  ): Promise<VariantPerformance> {
    // Check if performance record exists
    const workspace_id = requireWorkspaceId();
    const variant = await prisma.prompt_variants.findFirst({ where: { id: variantId, workspace_id } });
    if (!variant) throw new Error("Variant not found");
    const performance = await prisma.variant_performance.upsert({
      where: { variant_id: variantId },
      create: {
        workspace_id, variant_id: variantId, avg_visibility: metrics.avgVisibility,
        avg_position: metrics.avgPosition, avg_mentions: metrics.avgMentions,
        sample_size: metrics.sampleSize, last_calculated: new Date(),
      },
      update: {
        avg_visibility: metrics.avgVisibility, avg_position: metrics.avgPosition,
        avg_mentions: metrics.avgMentions, sample_size: metrics.sampleSize, last_calculated: new Date(),
      },
    });
    return fromPrismaRow<VariantPerformance>(performance as unknown as Record<string, unknown>);
  }

  /**
   * Determine the winner among variants
   * Returns null if no clear winner or insufficient data
   */
  async determineWinner(basePromptId: number): Promise<PromptVariant | null> {
    const variants = await this.getVariantsWithPerformance(basePromptId);

    // Filter variants with enough samples
    const validVariants = variants.filter(
      v => v.performance && v.performance.sampleSize !== null &&
           v.performance.sampleSize >= MIN_SAMPLES_FOR_WINNER
    );

    if (validVariants.length < 2) {
      return null; // Not enough data to compare
    }

    // Sort by visibility score (primary metric)
    const sorted = validVariants.sort((a, b) => {
      const aScore = a.performance?.avgVisibility || 0;
      const bScore = b.performance?.avgVisibility || 0;
      return bScore - aScore;
    });

    const winner = sorted[0];
    const runnerUp = sorted[1];

    const winnerScore = winner.performance?.avgVisibility || 0;
    const runnerUpScore = runnerUp.performance?.avgVisibility || 0;

    // Require minimum improvement to declare winner
    if (runnerUpScore === 0) {
      return winnerScore > 0 ? winner : null;
    }

    const improvement = ((winnerScore - runnerUpScore) / runnerUpScore) * 100;

    if (improvement < MIN_IMPROVEMENT_PERCENT) {
      return null; // No clear winner
    }

    return winner;
  }

  /**
   * Promote a winning variant - updates the base prompt text
   */
  async promoteVariant(variantId: number): Promise<{ success: boolean; message: string }> {
    const variant = await this.getById(variantId);
    if (!variant) {
      return { success: false, message: 'Variant not found' };
    }

    // Update base prompt text
    const workspace_id = requireWorkspaceId();
    await prisma.prompts.updateMany({ where: { id: variant.basePromptId, workspace_id }, data: { text: variant.text } });
    await prisma.prompt_variants.updateMany({ where: { id: variantId, workspace_id }, data: { is_winner: true } });
    await prisma.prompt_variants.updateMany({
      where: { base_prompt_id: variant.basePromptId, workspace_id, id: { not: variantId } }, data: { is_winner: false },
    });

    return { success: true, message: 'Variant promoted to base prompt' };
  }

  /**
   * Compare variants and provide insights
   */
  async compareVariants(basePromptId: number): Promise<VariantComparison> {
    const variants = await this.getVariantsWithPerformance(basePromptId);
    const winner = await this.determineWinner(basePromptId);

    const insights: string[] = [];

    // Generate insights
    if (winner) {
      insights.push(`Variant ${winner.variantLabel} outperforms others by ${MIN_IMPROVEMENT_PERCENT}%+`);
    }

    const validVariants = variants.filter(
      v => v.performance && v.performance.sampleSize !== null && v.performance.sampleSize > 0
    );

    if (validVariants.length < variants.length) {
      const pendingCount = variants.length - validVariants.length;
      insights.push(`${pendingCount} variant(s) need more data (min ${MIN_SAMPLES_FOR_WINNER} samples)`);
    }

    if (validVariants.length >= 2 && !winner) {
      insights.push('Results are too close to declare a clear winner');
    }

    // Check for control variant
    const controlVariant = variants.find(v => v.isControl);
    const winnerVariant = winner ? variants.find(v => v.id === winner.id) : null;
    if (controlVariant && winnerVariant && winner && winner.id !== controlVariant.id) {
      const controlScore = controlVariant.performance?.avgVisibility || 0;
      const winnerScore = winnerVariant.performance?.avgVisibility || 0;
      if (controlScore > 0) {
        const improvement = ((winnerScore - controlScore) / controlScore) * 100;
        insights.push(`Winner improves ${improvement.toFixed(1)}% over control`);
      }
    }

    return {
      variants: variants.map(v => ({
        id: v.id,
        label: v.variantLabel,
        text: v.text,
        isControl: v.isControl || false,
        isWinner: v.isWinner || false,
        performance: {
          avgVisibility: v.performance?.avgVisibility || 0,
          avgPosition: v.performance?.avgPosition || 0,
          avgMentions: v.performance?.avgMentions || 0,
          sampleSize: v.performance?.sampleSize || 0,
        },
      })),
      winner: winner?.variantLabel || null,
      insights,
    };
  }

  /**
   * Set control variant
   */
  async setControl(variantId: number): Promise<PromptVariant | null> {
    const variant = await this.getById(variantId);
    if (!variant) {
      return null;
    }

    // Unset other controls for this base prompt
    const workspace_id = requireWorkspaceId();
    await prisma.prompt_variants.updateMany({ where: { base_prompt_id: variant.basePromptId, workspace_id }, data: { is_control: false } });
    await prisma.prompt_variants.updateMany({ where: { id: variantId, workspace_id }, data: { is_control: true } });
    return this.getById(variantId);
  }

  /**
   * Create control variant from base prompt
   */
  async createControlFromBase(basePromptId: number): Promise<PromptVariant> {
    // Get base prompt
    const basePrompt = await prisma.prompts.findFirst({ where: { id: basePromptId, workspace_id: requireWorkspaceId() } });
    if (!basePrompt) {
      throw new Error('Base prompt not found');
    }

    // Create control variant with base prompt text
    return this.create(basePromptId, basePrompt.text, true);
  }

  /**
   * Get all prompts with variants
   */
  async getPromptsWithVariants(): Promise<{ promptId: number; variantCount: number }[]> {
    const results = await prisma.prompt_variants.groupBy({
      by: ["base_prompt_id"], where: { workspace_id: requireWorkspaceId() }, _count: { _all: true },
    });
    return results.map((row) => ({ promptId: row.base_prompt_id, variantCount: row._count._all }));
  }
}

// Singleton instance
let globalVariantManager: VariantManager | null = null;

export function getVariantManager(): VariantManager {
  if (!globalVariantManager) {
    globalVariantManager = new VariantManager();
  }
  return globalVariantManager;
}

export function resetGlobalVariantManager(): void {
  globalVariantManager = null;
}
