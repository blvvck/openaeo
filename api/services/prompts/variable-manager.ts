/**
 * Variable Manager Service
 *
 * Handles template variable/placeholder management including:
 * - CRUD operations for variable definitions
 * - Variable validation
 * - Default variable provision
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, toPrismaData } from "../../prisma-mapping";
import {
  TemplateVariable,
  InsertTemplateVariable,
  VariableType,
} from '../../../shared/schema';

/**
 * Default system variables
 */
export const SYSTEM_VARIABLES = [
  {
    name: 'brand',
    label: 'Brand Name',
    description: 'The name of the brand being analyzed',
    isRequired: true,
    variableType: 'text' as VariableType,
  },
  {
    name: 'competitor',
    label: 'Competitor Name',
    description: 'A competitor brand name',
    isRequired: false,
    variableType: 'text' as VariableType,
  },
  {
    name: 'competitors',
    label: 'Competitor List',
    description: 'List of competitor names',
    isRequired: false,
    variableType: 'list' as VariableType,
  },
  {
    name: 'category',
    label: 'Product Category',
    description: 'The product or service category',
    isRequired: false,
    variableType: 'text' as VariableType,
  },
  {
    name: 'industry',
    label: 'Industry',
    description: 'The industry or market vertical',
    isRequired: false,
    variableType: 'text' as VariableType,
  },
  {
    name: 'feature',
    label: 'Product Feature',
    description: 'A specific product feature to focus on',
    isRequired: false,
    variableType: 'text' as VariableType,
  },
  {
    name: 'use_case',
    label: 'Use Case',
    description: 'A specific use case or scenario',
    isRequired: false,
    variableType: 'text' as VariableType,
  },
  {
    name: 'audience',
    label: 'Target Audience',
    description: 'The target audience or persona',
    isRequired: false,
    variableType: 'text' as VariableType,
  },
  {
    name: 'region',
    label: 'Geographic Region',
    description: 'A geographic region or market',
    isRequired: false,
    variableType: 'text' as VariableType,
  },
  {
    name: 'year',
    label: 'Year',
    description: 'A specific year for temporal queries',
    isRequired: false,
    variableType: 'number' as VariableType,
    defaultValue: new Date().getFullYear().toString(),
  },
];

/**
 * Variable with usage statistics
 */
export interface VariableWithUsage extends TemplateVariable {
  usageCount: number;
}

/**
 * Variable Manager class
 */
export class VariableManager {
  /**
   * Initialize system variables if they don't exist
   */
  async initializeSystemVariables(): Promise<number> {
    let created = 0;

    for (const variable of SYSTEM_VARIABLES) {
      const existing = await this.getByName(variable.name);
      if (!existing) {
        await this.create({
          name: variable.name,
          label: variable.label,
          description: variable.description,
          isRequired: variable.isRequired,
          variableType: variable.variableType,
          defaultValue: (variable as any).defaultValue,
        });
        created++;
      }
    }

    return created;
  }

  /**
   * Create a new variable
   */
  async create(data: InsertTemplateVariable): Promise<TemplateVariable> {
    const name = data.name.trim().toLowerCase();
    const label = data.label.trim();

    if (!name) {
      throw new Error('Variable name is required');
    }

    if (!label) {
      throw new Error('Variable label is required');
    }

    // Validate name format (alphanumeric and underscores only)
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      throw new Error('Variable name must start with a letter and contain only lowercase letters, numbers, and underscores');
    }

    if (name.length > 50) {
      throw new Error('Variable name must be 50 characters or less');
    }

    // Check for duplicate
    const existing = await this.getByName(name);
    if (existing) {
      throw new Error(`Variable "${name}" already exists`);
    }

    const variable = await prisma.template_variables.create({
      data: { ...toPrismaData(data), name, label } as any,
    });
    return fromPrismaRow<TemplateVariable>(variable as unknown as Record<string, unknown>);
  }

  /**
   * Get all variables
   */
  async getAll(): Promise<TemplateVariable[]> {
    const rows = await prisma.template_variables.findMany();
    return rows.map((row) => fromPrismaRow<TemplateVariable>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get a variable by ID
   */
  async getById(id: number): Promise<TemplateVariable | null> {
    const variable = await prisma.template_variables.findUnique({ where: { id } });
    return variable ? fromPrismaRow<TemplateVariable>(variable as unknown as Record<string, unknown>) : null;
  }

  /**
   * Get a variable by name
   */
  async getByName(name: string): Promise<TemplateVariable | null> {
    const variable = await prisma.template_variables.findUnique({ where: { name: name.toLowerCase() } });
    return variable ? fromPrismaRow<TemplateVariable>(variable as unknown as Record<string, unknown>) : null;
  }

  /**
   * Update a variable
   */
  async update(
    id: number,
    updates: Partial<Pick<TemplateVariable, 'label' | 'description' | 'defaultValue' | 'isRequired' | 'variableType'>>
  ): Promise<TemplateVariable | null> {
    if (updates.label !== undefined) {
      updates.label = updates.label.trim();
      if (!updates.label) {
        throw new Error('Variable label is required');
      }
    }

    const result = await prisma.template_variables.updateMany({ where: { id }, data: toPrismaData(updates) as any });
    if (!result.count) return null;
    return this.getById(id);
  }

  /**
   * Delete a variable
   */
  async delete(id: number): Promise<boolean> {
    const result = await prisma.template_variables.deleteMany({ where: { id } });
    return result.count > 0;
  }

  /**
   * Get required variables
   */
  async getRequired(): Promise<TemplateVariable[]> {
    const rows = await prisma.template_variables.findMany({ where: { is_required: true } });
    return rows.map((row) => fromPrismaRow<TemplateVariable>(row as unknown as Record<string, unknown>));
  }

  /**
   * Validate a context against required variables
   */
  async validateContext(context: Record<string, unknown>): Promise<{
    valid: boolean;
    missing: string[];
    extra: string[];
  }> {
    const requiredVars = await this.getRequired();
    const allVars = await this.getAll();

    const requiredNames = requiredVars.map(v => v.name);
    const allNames = allVars.map(v => v.name);
    const contextKeys = Object.keys(context);

    const missing = requiredNames.filter(name => !(name in context));
    const extra = contextKeys.filter(key => !allNames.includes(key));

    return {
      valid: missing.length === 0,
      missing,
      extra,
    };
  }

  /**
   * Get a context with default values filled in
   */
  async applyDefaults(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const allVars = await this.getAll();
    const result = { ...context };

    for (const variable of allVars) {
      if (!(variable.name in result) && variable.defaultValue) {
        result[variable.name] = variable.defaultValue;
      }
    }

    return result;
  }

  /**
   * Get or create a variable
   */
  async getOrCreate(name: string, label: string, options?: {
    description?: string;
    defaultValue?: string;
    isRequired?: boolean;
    variableType?: VariableType;
  }): Promise<TemplateVariable> {
    const existing = await this.getByName(name);
    if (existing) {
      return existing;
    }

    return this.create({
      name,
      label,
      ...options,
    });
  }

  /**
   * Format a placeholder for a variable
   */
  formatPlaceholder(variableName: string): string {
    return `{{${variableName}}}`;
  }

  /**
   * Get all available placeholders
   */
  async getPlaceholders(): Promise<Array<{ placeholder: string; variable: TemplateVariable }>> {
    const variables = await this.getAll();
    return variables.map(v => ({
      placeholder: this.formatPlaceholder(v.name),
      variable: v,
    }));
  }
}

// Singleton instance
let globalVariableManager: VariableManager | null = null;

export function getVariableManager(): VariableManager {
  if (!globalVariableManager) {
    globalVariableManager = new VariableManager();
  }
  return globalVariableManager;
}

export function resetGlobalVariableManager(): void {
  globalVariableManager = null;
}
