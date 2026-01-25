/**
 * Persona Manager Service
 *
 * Handles CRUD operations for personas and persona-prompt associations.
 * Personas represent different user segments/locations for geo-targeted testing.
 */

import { prisma } from '../../prisma';
import { currentWorkspaceId } from '../../context/workspace-context';
import type { Persona, InsertPersona } from '../../../shared/schema';

function workspaceId(): string {
  const id = currentWorkspaceId();
  if (!id) throw new Error('Workspace context is required for data access');
  return id;
}

function mapPersona(row: Record<string, unknown>): Persona {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as Persona;
}

/**
 * Valid ISO 3166-1 alpha-2 country codes (common ones)
 * Add more as needed
 */
export const SUPPORTED_COUNTRIES: Record<string, string> = {
  'US': 'United States',
  'UK': 'United Kingdom',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'ES': 'Spain',
  'IT': 'Italy',
  'JP': 'Japan',
  'CN': 'China',
  'KR': 'South Korea',
  'AU': 'Australia',
  'CA': 'Canada',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'IN': 'India',
  'NL': 'Netherlands',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'BE': 'Belgium',
  'IE': 'Ireland',
  'PT': 'Portugal',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'NZ': 'New Zealand',
  'ZA': 'South Africa',
};

/**
 * Persona with prompt count
 */
export interface PersonaWithCount extends Persona {
  promptCount: number;
}

/**
 * Persona Manager class
 */
export class PersonaManager {
  /**
   * Create a new persona
   */
  async create(data: InsertPersona): Promise<Persona> {
    const trimmedName = data.name.trim();

    if (!trimmedName) {
      throw new Error('Persona name is required');
    }

    if (trimmedName.length > 100) {
      throw new Error('Persona name must be 100 characters or less');
    }

    // Validate country code if provided
    if (data.country) {
      const upperCountry = data.country.toUpperCase();
      if (upperCountry.length !== 2) {
        throw new Error('Country code must be a 2-letter ISO code');
      }
      // Note: We don't strictly validate against SUPPORTED_COUNTRIES
      // to allow flexibility for new countries
      data.country = upperCountry;
    }

    const persona = await prisma.personas.create({
      data: {
        workspace_id: workspaceId(),
        name: trimmedName,
        country: data.country || null,
        description: data.description?.trim() || null,
      },
    });

    return mapPersona(persona);
  }

  /**
   * Get all personas with prompt counts
   */
  async getAll(): Promise<PersonaWithCount[]> {
    const allPersonas = await prisma.personas.findMany({ where: { workspace_id: workspaceId() }, orderBy: { name: 'asc' } });
    const personaCounts = await prisma.prompts.groupBy({
      by: ['persona_id'],
      where: { workspace_id: workspaceId(), persona_id: { not: null } },
      _count: { _all: true },
    });
    const countMap = new Map(personaCounts.map((item) => [item.persona_id, item._count._all]));

    return allPersonas.map((row) => ({
      ...mapPersona(row),
      promptCount: countMap.get(row.id) || 0,
    }));
  }

  /**
   * Get a persona by ID
   */
  async getById(id: number): Promise<Persona | null> {
    const persona = await prisma.personas.findFirst({ where: { id, workspace_id: workspaceId() } });
    return persona ? mapPersona(persona) : null;
  }

  /**
   * Get a persona by name (case-insensitive)
   */
  async getByName(name: string): Promise<Persona | null> {
    const persona = await prisma.personas.findFirst({
      where: { workspace_id: workspaceId(), name: { equals: name, mode: 'insensitive' } },
    });
    return persona ? mapPersona(persona) : null;
  }

  /**
   * Update a persona
   */
  async update(
    id: number,
    updates: Partial<Pick<Persona, 'name' | 'country' | 'description'>>
  ): Promise<Persona | null> {
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Persona name is required');
      }
      if (trimmedName.length > 100) {
        throw new Error('Persona name must be 100 characters or less');
      }
      updates.name = trimmedName;
    }

    if (updates.country !== undefined && updates.country !== null) {
      const upperCountry = updates.country.toUpperCase();
      if (upperCountry.length !== 2) {
        throw new Error('Country code must be a 2-letter ISO code');
      }
      updates.country = upperCountry;
    }

    if (updates.description !== undefined && updates.description !== null) {
      updates.description = updates.description.trim() || null;
    }

    const result = await prisma.personas.updateMany({
      where: { id, workspace_id: workspaceId() },
      data: { ...updates, country: updates.country, description: updates.description },
    });
    if (!result.count) return null;
    return this.getById(id);
  }

  /**
   * Delete a persona (also unassigns from prompts)
   */
  async delete(id: number): Promise<boolean> {
    // First unassign persona from prompts
    const workspace_id = workspaceId();
    return prisma.$transaction(async (transaction) => {
      await transaction.prompts.updateMany({ where: { persona_id: id, workspace_id }, data: { persona_id: null } });
      const result = await transaction.personas.deleteMany({ where: { id, workspace_id } });
      return result.count > 0;
    });
  }

  /**
   * Assign a persona to a prompt
   */
  async assignToPrompt(promptId: number, personaId: number | null): Promise<boolean> {
    // Verify persona exists if not null
    if (personaId !== null) {
      const persona = await this.getById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }
    }

    const result = await prisma.prompts.updateMany({
      where: { id: promptId, workspace_id: workspaceId() },
      data: { persona_id: personaId },
    });
    return result.count > 0;
  }

  /**
   * Get all prompts for a persona
   */
  async getPromptIds(personaId: number): Promise<number[]> {
    const results = await prisma.prompts.findMany({
      where: { persona_id: personaId, workspace_id: workspaceId() },
      select: { id: true },
    });
    return results.map((row) => row.id);
  }

  /**
   * Bulk assign persona to multiple prompts
   */
  async bulkAssign(promptIds: number[], personaId: number | null): Promise<number> {
    // Verify persona exists if not null
    if (personaId !== null) {
      const persona = await this.getById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }
    }

    if (promptIds.length === 0) {
      return 0;
    }

    const result = await prisma.prompts.updateMany({
      where: { id: { in: promptIds }, workspace_id: workspaceId() },
      data: { persona_id: personaId },
    });
    return result.count;
  }

  /**
   * Get or create a persona by name
   */
  async getOrCreate(name: string, country?: string, description?: string): Promise<Persona> {
    const existing = await this.getByName(name);
    if (existing) {
      return existing;
    }
    return this.create({ name, country, description });
  }
}

// Singleton instance
let globalPersonaManager: PersonaManager | null = null;

export function getPersonaManager(): PersonaManager {
  if (!globalPersonaManager) {
    globalPersonaManager = new PersonaManager();
  }
  return globalPersonaManager;
}

export function resetGlobalPersonaManager(): void {
  globalPersonaManager = null;
}
