export function canScheduleWorkspace(workspace: { is_demo: boolean }): boolean {
  return !workspace.is_demo;
}
