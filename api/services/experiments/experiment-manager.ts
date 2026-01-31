/**
 * Experiment Manager Service
 *
 * Manages A/B test experiments including:
 * - CRUD operations for experiments
 * - Variant assignment
 * - Experiment lifecycle management
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId, toPrismaData } from "../../prisma-mapping";
import {
  type Experiment,
  type InsertExperiment,
  type ExperimentVariantLink,
  type ExperimentResult,
  type ExperimentStatus,
} from '../../../shared/schema';

/**
 * Experiment with its linked variants
 */
export interface ExperimentWithVariants extends Experiment {
  variants: Array<{
    id: number;
    variantId: number;
    trafficAllocation: number | null;
    variantLabel: string;
    variantText: string;
    isControl: boolean | null;
  }>;
}

/**
 * Experiment Manager class
 */
export class ExperimentManager {
  /**
   * Create a new experiment
   */
  async create(data: InsertExperiment): Promise<Experiment> {
    const experiment = await prisma.experiments.create({
      data: { ...toPrismaData(data), workspace_id: requireWorkspaceId() } as any,
    });
    return fromPrismaRow<Experiment>(experiment as unknown as Record<string, unknown>);
  }

  /**
   * Get an experiment by ID
   */
  async getById(id: number): Promise<Experiment | null> {
    const experiment = await prisma.experiments.findFirst({ where: { id, workspace_id: requireWorkspaceId() } });
    return experiment ? fromPrismaRow<Experiment>(experiment as unknown as Record<string, unknown>) : null;
  }

  /**
   * Get an experiment with its variants
   */
  async getWithVariants(id: number): Promise<ExperimentWithVariants | null> {
    const experiment = await this.getById(id);
    if (!experiment) return null;

    const links = await prisma.experiment_variants.findMany({
      where: { workspace_id: requireWorkspaceId(), experiment_id: id },
      include: { prompt_variants: { select: { variant_label: true, text: true, is_control: true } } },
    });
    const variantLinks = links.map((link) => ({
      id: link.id,
      variantId: link.variant_id,
      trafficAllocation: link.traffic_allocation,
      variantLabel: link.prompt_variants.variant_label,
      variantText: link.prompt_variants.text,
      isControl: link.prompt_variants.is_control,
    }));

    return {
      ...experiment,
      variants: variantLinks,
    };
  }

  /**
   * Get all experiments
   */
  async getAll(): Promise<Experiment[]> {
    const rows = await prisma.experiments.findMany({
      where: { workspace_id: requireWorkspaceId() }, orderBy: { created_at: "desc" },
    });
    return rows.map((row) => fromPrismaRow<Experiment>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get experiments by status
   */
  async getByStatus(status: ExperimentStatus): Promise<Experiment[]> {
    const rows = await prisma.experiments.findMany({
      where: { workspace_id: requireWorkspaceId(), status }, orderBy: { created_at: "desc" },
    });
    return rows.map((row) => fromPrismaRow<Experiment>(row as unknown as Record<string, unknown>));
  }

  /**
   * Update an experiment
   */
  async update(
    id: number,
    data: Partial<InsertExperiment>
  ): Promise<Experiment | null> {
    const result = await prisma.experiments.updateMany({
      where: { id, workspace_id: requireWorkspaceId() },
      data: { ...toPrismaData(data), updated_at: new Date() } as any,
    });
    return result.count ? this.getById(id) : null;
  }

  /**
   * Delete an experiment
   */
  async delete(id: number): Promise<boolean> {
    const result = await prisma.experiments.deleteMany({ where: { id, workspace_id: requireWorkspaceId() } });
    return result.count > 0;
  }

  /**
   * Add a variant to an experiment
   */
  async addVariant(
    experimentId: number,
    variantId: number,
    trafficAllocation: number = 50
  ): Promise<ExperimentVariantLink> {
    const link = await prisma.experiment_variants.create({
      data: { workspace_id: requireWorkspaceId(), experiment_id: experimentId, variant_id: variantId, traffic_allocation: trafficAllocation },
    });
    return fromPrismaRow<ExperimentVariantLink>(link as unknown as Record<string, unknown>);
  }

  /**
   * Remove a variant from an experiment
   */
  async removeVariant(experimentId: number, variantId: number): Promise<boolean> {
    const result = await prisma.experiment_variants.deleteMany({
      where: { workspace_id: requireWorkspaceId(), experiment_id: experimentId, variant_id: variantId },
    });
    return result.count > 0;
  }

  /**
   * Update traffic allocation for a variant
   */
  async updateTrafficAllocation(
    experimentId: number,
    variantId: number,
    allocation: number
  ): Promise<ExperimentVariantLink | null> {
    const where = { workspace_id: requireWorkspaceId(), experiment_id: experimentId, variant_id: variantId };
    const result = await prisma.experiment_variants.updateMany({ where, data: { traffic_allocation: allocation } });
    if (!result.count) return null;
    const updated = await prisma.experiment_variants.findFirst({ where });
    return updated ? fromPrismaRow<ExperimentVariantLink>(updated as unknown as Record<string, unknown>) : null;
  }

  /**
   * Start an experiment
   */
  async start(id: number): Promise<Experiment | null> {
    const experiment = await this.getWithVariants(id);
    if (!experiment) return null;

    if (experiment.variants.length < 2) {
      throw new Error('Experiment must have at least 2 variants');
    }

    return this.update(id, {
      status: 'running',
      startedAt: new Date(),
    });
  }

  /**
   * Pause an experiment
   */
  async pause(id: number): Promise<Experiment | null> {
    return this.update(id, { status: 'paused' });
  }

  /**
   * Resume a paused experiment
   */
  async resume(id: number): Promise<Experiment | null> {
    return this.update(id, { status: 'running' });
  }

  /**
   * Complete an experiment
   */
  async complete(id: number, winnerVariantId?: number): Promise<Experiment | null> {
    return this.update(id, {
      status: 'completed',
      endedAt: new Date(),
      winnerVariantId: winnerVariantId ?? null,
    });
  }

  /**
   * Get results for an experiment
   */
  async getResults(experimentId: number): Promise<ExperimentResult[]> {
    const rows = await prisma.experiment_results.findMany({ where: { workspace_id: requireWorkspaceId(), experiment_id: experimentId } });
    return rows.map((row) => fromPrismaRow<ExperimentResult>(row as unknown as Record<string, unknown>));
  }

  /**
   * Update or create results for a variant
   */
  async upsertResult(
    experimentId: number,
    variantId: number,
    data: Partial<ExperimentResult>
  ): Promise<ExperimentResult> {
    // Check if exists
    const where = { workspace_id: requireWorkspaceId(), experiment_id: experimentId, variant_id: variantId };
    const existing = await prisma.experiment_results.findFirst({ where });

    if (existing) {
      const updated = await prisma.experiment_results.update({
        where: { id: existing.id }, data: { ...toPrismaData(data), calculated_at: new Date() } as any,
      });
      return fromPrismaRow<ExperimentResult>(updated as unknown as Record<string, unknown>);
    }

    const created = await prisma.experiment_results.create({
      data: { workspace_id: requireWorkspaceId(), experiment_id: experimentId, variant_id: variantId, ...toPrismaData(data) } as any,
    });
    return fromPrismaRow<ExperimentResult>(created as unknown as Record<string, unknown>);
  }

  /**
   * Get running experiments
   */
  async getRunningExperiments(): Promise<ExperimentWithVariants[]> {
    const runningExperiments = await this.getByStatus('running');
    const withVariants: ExperimentWithVariants[] = [];

    for (const exp of runningExperiments) {
      const withVar = await this.getWithVariants(exp.id);
      if (withVar) {
        withVariants.push(withVar);
      }
    }

    return withVariants;
  }
}

// Singleton instance
let globalExperimentManager: ExperimentManager | null = null;

export function getExperimentManager(): ExperimentManager {
  if (!globalExperimentManager) {
    globalExperimentManager = new ExperimentManager();
  }
  return globalExperimentManager;
}

export function resetGlobalExperimentManager(): void {
  globalExperimentManager = null;
}
