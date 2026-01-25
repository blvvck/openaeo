/**
 * Variant Assignment Service
 *
 * Handles deterministic variant assignment for A/B testing using hash-based
 * assignment to ensure consistent assignment for the same prompt ID.
 */

import crypto from 'crypto';
import { getExperimentManager, ExperimentWithVariants } from './experiment-manager';

/**
 * Assignment result with variant details
 */
export interface VariantAssignment {
  experimentId: number;
  variantId: number;
  variantLabel: string;
  variantText: string;
  isControl: boolean;
}

/**
 * Hash a string using SHA-256 and return a number between 0 and 100
 */
function hashToPercentage(input: string): number {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  // Take first 8 hex characters (32 bits) and convert to number
  const num = parseInt(hash.substring(0, 8), 16);
  // Convert to percentage (0-100)
  return (num / 0xffffffff) * 100;
}

/**
 * Get deterministic variant assignment for a prompt in an experiment
 *
 * Uses a hash of the prompt ID and experiment ID to ensure:
 * 1. Same prompt always gets the same variant in an experiment
 * 2. Distribution follows traffic allocation percentages
 */
export function assignVariant(
  promptId: number,
  experiment: ExperimentWithVariants
): VariantAssignment | null {
  if (!experiment.variants || experiment.variants.length === 0) {
    return null;
  }

  // Create deterministic hash from prompt ID and experiment ID
  const hashInput = `${experiment.id}:${promptId}`;
  const percentage = hashToPercentage(hashInput);

  // Sort variants by ID for consistent ordering
  const sortedVariants = [...experiment.variants].sort(
    (a, b) => a.variantId - b.variantId
  );

  // Calculate cumulative allocation thresholds
  let cumulativeAllocation = 0;

  for (const variant of sortedVariants) {
    const allocation = variant.trafficAllocation ?? 50;
    cumulativeAllocation += allocation;

    if (percentage < cumulativeAllocation) {
      return {
        experimentId: experiment.id,
        variantId: variant.variantId,
        variantLabel: variant.variantLabel,
        variantText: variant.variantText,
        isControl: variant.isControl ?? false,
      };
    }
  }

  // Fallback to last variant if rounding issues
  const lastVariant = sortedVariants[sortedVariants.length - 1];
  return {
    experimentId: experiment.id,
    variantId: lastVariant.variantId,
    variantLabel: lastVariant.variantLabel,
    variantText: lastVariant.variantText,
    isControl: lastVariant.isControl ?? false,
  };
}

/**
 * Get all variant assignments for a prompt across running experiments
 */
export async function getAssignmentsForPrompt(
  promptId: number
): Promise<VariantAssignment[]> {
  const manager = getExperimentManager();
  const runningExperiments = await manager.getRunningExperiments();

  const assignments: VariantAssignment[] = [];

  for (const experiment of runningExperiments) {
    const assignment = assignVariant(promptId, experiment);
    if (assignment) {
      assignments.push(assignment);
    }
  }

  return assignments;
}

/**
 * Get the prompt text to use for a given prompt ID, considering experiments
 *
 * If the prompt is part of a running experiment, returns the assigned variant text.
 * Otherwise, returns null (use original prompt text).
 */
export async function getExperimentPromptText(
  promptId: number,
  basePromptId?: number
): Promise<{ text: string; variantId: number; experimentId: number } | null> {
  const manager = getExperimentManager();
  const runningExperiments = await manager.getRunningExperiments();

  // Find experiments that involve this prompt's variants
  for (const experiment of runningExperiments) {
    // Check if any variant in this experiment is related to the base prompt
    const variantForPrompt = experiment.variants.find(
      (v) => v.variantId === promptId || (basePromptId && v.variantId === basePromptId)
    );

    if (variantForPrompt) {
      const assignment = assignVariant(promptId, experiment);
      if (assignment) {
        return {
          text: assignment.variantText,
          variantId: assignment.variantId,
          experimentId: assignment.experimentId,
        };
      }
    }
  }

  return null;
}

/**
 * Simulate variant distribution for an experiment
 *
 * Useful for verifying that traffic allocation is working correctly.
 */
export function simulateDistribution(
  experiment: ExperimentWithVariants,
  sampleSize: number = 10000
): Record<number, { count: number; percentage: number; label: string }> {
  const distribution: Record<number, { count: number; percentage: number; label: string }> = {};

  // Initialize
  for (const variant of experiment.variants) {
    distribution[variant.variantId] = {
      count: 0,
      percentage: 0,
      label: variant.variantLabel,
    };
  }

  // Simulate assignments
  for (let i = 0; i < sampleSize; i++) {
    const assignment = assignVariant(i, experiment);
    if (assignment) {
      distribution[assignment.variantId].count++;
    }
  }

  // Calculate percentages
  for (const variantId of Object.keys(distribution)) {
    const id = parseInt(variantId, 10);
    distribution[id].percentage =
      (distribution[id].count / sampleSize) * 100;
  }

  return distribution;
}

/**
 * Verify that a specific prompt ID gets consistent assignment
 */
export function verifyConsistentAssignment(
  promptId: number,
  experiment: ExperimentWithVariants,
  iterations: number = 100
): boolean {
  const firstAssignment = assignVariant(promptId, experiment);
  if (!firstAssignment) return true;

  for (let i = 0; i < iterations; i++) {
    const assignment = assignVariant(promptId, experiment);
    if (!assignment || assignment.variantId !== firstAssignment.variantId) {
      return false;
    }
  }

  return true;
}
