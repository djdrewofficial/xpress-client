/** Read the Demo Mode flag from a mobile event payload (`demoMode` or `demo_mode`). */
export function readDemoModeFlag(event: Record<string, unknown> | null | undefined): boolean {
  if (!event) return false;
  if (event.demoMode === true || event.demo_mode === true) return true;
  return false;
}
