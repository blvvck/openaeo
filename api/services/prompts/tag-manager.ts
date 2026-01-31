/**
 * Tag Manager Service
 *
 * Handles CRUD operations for prompt tags and prompt-tag associations.
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId } from "../../prisma-mapping";
import type { Tag } from "../../../shared/schema";

/**
 * Tag with usage count
 */
export interface TagWithCount extends Tag {
  promptCount: number;
}

/**
 * Prompt with associated tags
 */
export interface PromptWithTags {
  promptId: number;
  tags: Tag[];
}

/**
 * Default tag colors for quick selection
 */
export const DEFAULT_TAG_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

/**
 * Tag Manager class
 */
export class TagManager {
  /**
   * Create a new tag
   */
  async create(name: string, color?: string): Promise<Tag> {
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new Error('Tag name is required');
    }

    if (trimmedName.length > 50) {
      throw new Error('Tag name must be 50 characters or less');
    }

    // Validate hex color if provided
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error('Color must be a valid hex color (e.g., #3B82F6)');
    }

    const tag = await prisma.tags.create({
      data: { workspace_id: requireWorkspaceId(), name: trimmedName, color: color || DEFAULT_TAG_COLORS[0] },
    });
    return fromPrismaRow<Tag>(tag as unknown as Record<string, unknown>);
  }

  /**
   * Get all tags with usage counts
   */
  async getAll(): Promise<TagWithCount[]> {
    const rows = await prisma.tags.findMany({
      where: { workspace_id: requireWorkspaceId() },
      include: { _count: { select: { prompt_tags: true } } },
    });
    return rows.map(({ _count, ...tag }) => ({
      ...fromPrismaRow<Tag>(tag as unknown as Record<string, unknown>),
      promptCount: _count.prompt_tags,
    }));
  }

  /**
   * Get a tag by ID
   */
  async getById(id: number): Promise<Tag | null> {
    const tag = await prisma.tags.findFirst({ where: { id, workspace_id: requireWorkspaceId() } });
    return tag ? fromPrismaRow<Tag>(tag as unknown as Record<string, unknown>) : null;
  }

  /**
   * Get a tag by name (case-insensitive)
   */
  async getByName(name: string): Promise<Tag | null> {
    const tag = await prisma.tags.findFirst({
      where: { workspace_id: requireWorkspaceId(), name: { equals: name, mode: "insensitive" } },
    });
    return tag ? fromPrismaRow<Tag>(tag as unknown as Record<string, unknown>) : null;
  }

  /**
   * Update a tag
   */
  async update(id: number, updates: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag | null> {
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Tag name is required');
      }
      if (trimmedName.length > 50) {
        throw new Error('Tag name must be 50 characters or less');
      }
      updates.name = trimmedName;
    }

    if (updates.color !== undefined && updates.color !== null && !/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
      throw new Error('Color must be a valid hex color (e.g., #3B82F6)');
    }

    const result = await prisma.tags.updateMany({
      where: { id, workspace_id: requireWorkspaceId() }, data: updates,
    });
    return result.count ? this.getById(id) : null;
  }

  /**
   * Delete a tag (also removes all prompt associations)
   */
  async delete(id: number): Promise<boolean> {
    const workspace_id = requireWorkspaceId();
    await prisma.prompt_tags.deleteMany({ where: { workspace_id, tag_id: id } });
    const result = await prisma.tags.deleteMany({ where: { id, workspace_id } });
    return result.count > 0;
  }

  /**
   * Assign a tag to a prompt
   */
  async assignToPrompt(promptId: number, tagId: number): Promise<boolean> {
    // Check if already assigned
    const workspace_id = requireWorkspaceId();
    const result = await prisma.prompt_tags.createMany({
      data: [{ workspace_id, prompt_id: promptId, tag_id: tagId }],
      skipDuplicates: true,
    });
    return result.count > 0;
  }

  /**
   * Remove a tag from a prompt
   */
  async removeFromPrompt(promptId: number, tagId: number): Promise<boolean> {
    const result = await prisma.prompt_tags.deleteMany({
      where: { workspace_id: requireWorkspaceId(), prompt_id: promptId, tag_id: tagId },
    });
    return result.count > 0;
  }

  /**
   * Get all tags for a prompt
   */
  async getTagsForPrompt(promptId: number): Promise<Tag[]> {
    const workspace_id = requireWorkspaceId();
    const links = await prisma.prompt_tags.findMany({ where: { workspace_id, prompt_id: promptId }, include: { tags: true } });
    return links.map(({ tags: tag }) => fromPrismaRow<Tag>(tag as unknown as Record<string, unknown>));
  }

  /**
   * Set all tags for a prompt (replaces existing)
   */
  async setTagsForPrompt(promptId: number, tagIds: number[]): Promise<Tag[]> {
    const workspace_id = requireWorkspaceId();
    await prisma.prompt_tags.deleteMany({ where: { workspace_id, prompt_id: promptId } });
    if (tagIds.length > 0) await prisma.prompt_tags.createMany({ data: tagIds.map((tag_id) => ({ workspace_id, prompt_id: promptId, tag_id })) });

    return this.getTagsForPrompt(promptId);
  }

  /**
   * Get prompt IDs by tag
   */
  async getPromptIdsByTag(tagId: number): Promise<number[]> {
    const results = await prisma.prompt_tags.findMany({
      where: { workspace_id: requireWorkspaceId(), tag_id: tagId }, select: { prompt_id: true },
    });
    return results.map((row) => row.prompt_id);
  }

  /**
   * Get prompt IDs by multiple tags (AND logic - must have all tags)
   */
  async getPromptIdsByTags(tagIds: number[]): Promise<number[]> {
    if (tagIds.length === 0) {
      return [];
    }

    const workspace_id = requireWorkspaceId();
    const results = await prisma.$queryRaw<Array<{ prompt_id: number }>>`
      SELECT prompt_id
      FROM prompt_tags
      WHERE workspace_id = ${workspace_id}::uuid AND tag_id = ANY(${tagIds}::int[])
      GROUP BY prompt_id
      HAVING count(DISTINCT tag_id) = ${tagIds.length}
    `;
    return results.map((row) => row.prompt_id);
  }

  /**
   * Get or create a tag by name
   */
  async getOrCreate(name: string, color?: string): Promise<Tag> {
    const existing = await this.getByName(name);
    if (existing) {
      return existing;
    }
    return this.create(name, color);
  }
}

// Singleton instance
let globalTagManager: TagManager | null = null;

export function getTagManager(): TagManager {
  if (!globalTagManager) {
    globalTagManager = new TagManager();
  }
  return globalTagManager;
}

export function resetGlobalTagManager(): void {
  globalTagManager = null;
}
