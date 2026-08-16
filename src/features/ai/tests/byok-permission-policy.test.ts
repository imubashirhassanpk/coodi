import { describe, expect, it } from "vitest";
import {
  BYOK_PERMISSION_STORAGE_KEY,
  getByokPermissionKey,
  loadByokPermissionPolicies,
  saveByokPermissionPolicy,
} from "@/features/ai/lib/byok-permission-policy";

describe("BYOK permission policy persistence", () => {
  it("scopes remembered decisions by workspace and exact tool", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    saveByokPermissionPolicy(storage, "/workspace-a", "read_file", true);
    saveByokPermissionPolicy(storage, "/workspace-a", "write_file", false);
    saveByokPermissionPolicy(storage, "/workspace-b", "write_file", true);

    expect(getByokPermissionKey("/workspace-a", "read_file")).toBe("/workspace-a:read_file");
    expect(loadByokPermissionPolicies(storage, "/workspace-a")).toEqual(
      new Map([
        ["/workspace-a:read_file", true],
        ["/workspace-a:write_file", false],
      ]),
    );
    expect(loadByokPermissionPolicies(storage, "/workspace-b")).toEqual(
      new Map([["/workspace-b:write_file", true]]),
    );
    expect(values.has(BYOK_PERMISSION_STORAGE_KEY)).toBe(true);
  });

  it("ignores malformed or unrelated stored values", () => {
    const storage = { getItem: () => JSON.stringify({ "/other:read_file": true, broken: "yes" }) };
    expect(loadByokPermissionPolicies(storage, "/workspace")).toEqual(new Map());
  });
});
