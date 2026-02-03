export function workspaceCacheKey(
  scope: string,
  workspaceId: string,
  ...parts: string[]
): string {
  return [scope, workspaceId, ...parts].join(":");
}
