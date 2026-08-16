export const BYOK_PERMISSION_STORAGE_KEY = "coodi-byok-permission-policies-v1";

export function getByokPermissionKey(workspaceRoot: string, toolName: string): string {
  return `${workspaceRoot}:${toolName}`;
}

export function loadByokPermissionPolicies(
  storage: Pick<Storage, "getItem"> | null | undefined,
  workspaceRoot: string,
): Map<string, boolean> {
  const policies = new Map<string, boolean>();
  if (!storage || !workspaceRoot) return policies;
  try {
    const raw = storage.getItem(BYOK_PERMISSION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith(`${workspaceRoot}:`) && typeof value === "boolean") {
        policies.set(key, value);
      }
    }
  } catch {
    return policies;
  }
  return policies;
}

export function saveByokPermissionPolicy(
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined,
  workspaceRoot: string,
  toolName: string,
  approved: boolean,
): void {
  if (!storage || !workspaceRoot) return;
  try {
    const raw = storage.getItem(BYOK_PERMISSION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    parsed[getByokPermissionKey(workspaceRoot, toolName)] = approved;
    storage.setItem(BYOK_PERMISSION_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Storage can be unavailable in private/browser test contexts.
  }
}
