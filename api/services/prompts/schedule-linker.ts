import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId } from "../../prisma-mapping";
import type { Prompt, PromptScheduleLink, PromptTemplate, ScanSchedule } from "../../../shared/schema";

export interface ScheduleLinkWithData extends PromptScheduleLink {
  prompt?: Prompt | null;
  template?: PromptTemplate | null;
  schedule: ScanSchedule;
}

export interface ScheduledPrompt {
  promptId: number;
  promptText: string;
  priority: number;
  source: "prompt" | "template";
  sourceId: number;
}

export interface BulkLinkResult {
  linked: number;
  skipped: number;
  errors: string[];
}

export class ScheduleLinker {
  async linkPromptToSchedule(promptId: number, scheduleId: number, options?: { priority?: number; isActive?: boolean }): Promise<PromptScheduleLink> {
    const workspace_id = requireWorkspaceId();
    const prompt = await prisma.prompts.findFirst({ where: { id: promptId, workspace_id, archived_at: null } });
    if (!prompt) throw new Error("Prompt not found or is archived");
    const schedule = await prisma.scan_schedules.findFirst({ where: { id: scheduleId, workspace_id } });
    if (!schedule) throw new Error("Schedule not found");
    const existing = await prisma.prompt_schedule_links.findFirst({ where: { workspace_id, prompt_id: promptId, schedule_id: scheduleId } });
    if (existing) throw new Error("Prompt is already linked to this schedule");
    const link = await prisma.prompt_schedule_links.create({
      data: { workspace_id, prompt_id: promptId, schedule_id: scheduleId, priority: options?.priority ?? 100, is_active: options?.isActive ?? true },
    });
    return fromPrismaRow<PromptScheduleLink>(link as unknown as Record<string, unknown>);
  }

  async linkTemplateToSchedule(templateId: number, scheduleId: number, options?: { priority?: number; isActive?: boolean }): Promise<PromptScheduleLink> {
    const workspace_id = requireWorkspaceId();
    const template = await prisma.prompt_templates.findFirst({ where: { id: templateId, workspace_id, archived_at: null } });
    if (!template) throw new Error("Template not found or is archived");
    const schedule = await prisma.scan_schedules.findFirst({ where: { id: scheduleId, workspace_id } });
    if (!schedule) throw new Error("Schedule not found");
    const existing = await prisma.prompt_schedule_links.findFirst({ where: { workspace_id, template_id: templateId, schedule_id: scheduleId } });
    if (existing) throw new Error("Template is already linked to this schedule");
    const link = await prisma.prompt_schedule_links.create({
      data: { workspace_id, template_id: templateId, schedule_id: scheduleId, priority: options?.priority ?? 100, is_active: options?.isActive ?? true },
    });
    return fromPrismaRow<PromptScheduleLink>(link as unknown as Record<string, unknown>);
  }

  async unlinkFromSchedule(linkId: number): Promise<boolean> {
    const result = await prisma.prompt_schedule_links.deleteMany({ where: { id: linkId, workspace_id: requireWorkspaceId() } });
    return result.count > 0;
  }

  async unlinkAllForPrompt(promptId: number): Promise<number> {
    const result = await prisma.prompt_schedule_links.deleteMany({ where: { prompt_id: promptId, workspace_id: requireWorkspaceId() } });
    return result.count;
  }

  async unlinkAllForTemplate(templateId: number): Promise<number> {
    const result = await prisma.prompt_schedule_links.deleteMany({ where: { template_id: templateId, workspace_id: requireWorkspaceId() } });
    return result.count;
  }

  async getLinksForSchedule(scheduleId: number): Promise<ScheduleLinkWithData[]> {
    const workspace_id = requireWorkspaceId();
    const [schedule, links] = await Promise.all([
      prisma.scan_schedules.findFirst({ where: { id: scheduleId, workspace_id } }),
      prisma.prompt_schedule_links.findMany({
        where: { schedule_id: scheduleId, workspace_id }, orderBy: { priority: "asc" },
        include: { prompts: true, prompt_templates: true },
      }),
    ]);
    if (!schedule) return [];
    return links.map((link) => ({
      ...fromPrismaRow<PromptScheduleLink>(link as unknown as Record<string, unknown>),
      prompt: link.prompts ? fromPrismaRow<Prompt>(link.prompts as unknown as Record<string, unknown>) : null,
      template: link.prompt_templates ? fromPrismaRow<PromptTemplate>(link.prompt_templates as unknown as Record<string, unknown>) : null,
      schedule: fromPrismaRow<ScanSchedule>(schedule as unknown as Record<string, unknown>),
    }));
  }

  async getSchedulesForPrompt(promptId: number): Promise<ScanSchedule[]> {
    const workspace_id = requireWorkspaceId();
    const links = await prisma.prompt_schedule_links.findMany({ where: { prompt_id: promptId, workspace_id }, select: { schedule_id: true } });
    const rows = await prisma.scan_schedules.findMany({ where: { workspace_id, id: { in: links.map((link) => link.schedule_id) } } });
    return rows.map((row) => fromPrismaRow<ScanSchedule>(row as unknown as Record<string, unknown>));
  }

  async getSchedulesForTemplate(templateId: number): Promise<ScanSchedule[]> {
    const workspace_id = requireWorkspaceId();
    const links = await prisma.prompt_schedule_links.findMany({ where: { template_id: templateId, workspace_id }, select: { schedule_id: true } });
    const rows = await prisma.scan_schedules.findMany({ where: { workspace_id, id: { in: links.map((link) => link.schedule_id) } } });
    return rows.map((row) => fromPrismaRow<ScanSchedule>(row as unknown as Record<string, unknown>));
  }

  async getPromptsForExecution(scheduleId: number): Promise<ScheduledPrompt[]> {
    const links = await prisma.prompt_schedule_links.findMany({
      where: { schedule_id: scheduleId, workspace_id: requireWorkspaceId(), is_active: true },
      orderBy: { priority: "asc" }, include: { prompts: true, prompt_templates: true },
    });
    const result: ScheduledPrompt[] = [];
    for (const link of links) {
      if (link.prompts && !link.prompts.archived_at) {
        result.push({ promptId: link.prompts.id, promptText: link.prompts.text, priority: link.priority ?? 100, source: "prompt", sourceId: link.prompts.id });
      } else if (link.prompt_templates && !link.prompt_templates.archived_at) {
        result.push({ promptId: 0, promptText: link.prompt_templates.template, priority: link.priority ?? 100, source: "template", sourceId: link.prompt_templates.id });
      }
    }
    return result;
  }

  async updatePriority(linkId: number, priority: number): Promise<PromptScheduleLink | null> {
    if (priority < 0) throw new Error("Priority must be non-negative");
    const workspace_id = requireWorkspaceId();
    const result = await prisma.prompt_schedule_links.updateMany({ where: { id: linkId, workspace_id }, data: { priority } });
    if (!result.count) return null;
    const row = await prisma.prompt_schedule_links.findFirst({ where: { id: linkId, workspace_id } });
    return row ? fromPrismaRow<PromptScheduleLink>(row as unknown as Record<string, unknown>) : null;
  }

  async toggleActive(linkId: number, isActive: boolean): Promise<PromptScheduleLink | null> {
    const workspace_id = requireWorkspaceId();
    const result = await prisma.prompt_schedule_links.updateMany({ where: { id: linkId, workspace_id }, data: { is_active: isActive } });
    if (!result.count) return null;
    const row = await prisma.prompt_schedule_links.findFirst({ where: { id: linkId, workspace_id } });
    return row ? fromPrismaRow<PromptScheduleLink>(row as unknown as Record<string, unknown>) : null;
  }

  async bulkLinkPrompts(promptIds: number[], scheduleId: number, options?: { basePriority?: number }): Promise<BulkLinkResult> {
    return this.bulkLink(promptIds, scheduleId, options?.basePriority ?? 100, "prompt");
  }

  async bulkLinkTemplates(templateIds: number[], scheduleId: number, options?: { basePriority?: number }): Promise<BulkLinkResult> {
    return this.bulkLink(templateIds, scheduleId, options?.basePriority ?? 100, "template");
  }

  private async bulkLink(ids: number[], scheduleId: number, basePriority: number, source: "prompt" | "template"): Promise<BulkLinkResult> {
    const result: BulkLinkResult = { linked: 0, skipped: 0, errors: [] };
    for (let index = 0; index < ids.length; index++) {
      try {
        const options = { priority: basePriority + index };
        if (source === "prompt") await this.linkPromptToSchedule(ids[index], scheduleId, options);
        else await this.linkTemplateToSchedule(ids[index], scheduleId, options);
        result.linked++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("already linked")) result.skipped++;
        else result.errors.push(`${source === "prompt" ? "Prompt" : "Template"} ${ids[index]}: ${message}`);
      }
    }
    return result;
  }

  async reorderLinks(scheduleId: number, linkOrder: number[]): Promise<void> {
    const workspace_id = requireWorkspaceId();
    await prisma.$transaction(linkOrder.map((id, priority) => prisma.prompt_schedule_links.updateMany({
      where: { id, schedule_id: scheduleId, workspace_id }, data: { priority },
    })));
  }

  async copyLinksToSchedule(fromScheduleId: number, toScheduleId: number): Promise<number> {
    const workspace_id = requireWorkspaceId();
    const links = await prisma.prompt_schedule_links.findMany({ where: { schedule_id: fromScheduleId, workspace_id } });
    let copied = 0;
    for (const link of links) {
      const existing = await prisma.prompt_schedule_links.findFirst({
        where: { workspace_id, schedule_id: toScheduleId, prompt_id: link.prompt_id, template_id: link.template_id },
      });
      if (existing) continue;
      await prisma.prompt_schedule_links.create({
        data: { workspace_id, prompt_id: link.prompt_id, template_id: link.template_id, schedule_id: toScheduleId, priority: link.priority, is_active: link.is_active },
      });
      copied++;
    }
    return copied;
  }

  async getScheduleLinkStats(scheduleId: number): Promise<{ totalLinks: number; activeLinks: number; promptLinks: number; templateLinks: number }> {
    const links = await prisma.prompt_schedule_links.findMany({ where: { schedule_id: scheduleId, workspace_id: requireWorkspaceId() } });
    return {
      totalLinks: links.length,
      activeLinks: links.filter((link) => link.is_active).length,
      promptLinks: links.filter((link) => link.prompt_id !== null).length,
      templateLinks: links.filter((link) => link.template_id !== null).length,
    };
  }
}

let globalScheduleLinker: ScheduleLinker | null = null;

export function getScheduleLinker(): ScheduleLinker {
  if (!globalScheduleLinker) globalScheduleLinker = new ScheduleLinker();
  return globalScheduleLinker;
}

export function resetGlobalScheduleLinker(): void {
  globalScheduleLinker = null;
}
