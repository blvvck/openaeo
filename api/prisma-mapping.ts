import { currentWorkspaceId } from "./context/workspace-context";

export function requireWorkspaceId(): string {
  const workspaceId = currentWorkspaceId();
  if (!workspaceId) throw new Error("Workspace context is required for data access");
  return workspaceId;
}

export function toPrismaData(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
    item,
  ]));
}

export function fromPrismaRow<T>(value: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), item])) as T;
}
