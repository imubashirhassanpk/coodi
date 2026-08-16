import { describe, expect, it } from "vitest";
import {
  BYOK_TOOL_DEFINITIONS,
  getByokToolDescription,
  isByokToolName,
  parseByokToolArguments,
} from "@/features/ai/lib/byok-tools";

describe("BYOK tool security contract", () => {
  it("exposes only the bounded workspace tools", () => {
    expect(BYOK_TOOL_DEFINITIONS.map((tool) => tool.function.name)).toEqual([
      "read_file",
      "list_files",
      "create_file",
      "write_file",
      "apply_patch",
      "run_terminal_command",
    ]);
    expect(BYOK_TOOL_DEFINITIONS.every((tool) => tool.function.parameters.additionalProperties === false)).toBe(true);
  });

  it("accepts object JSON arguments and rejects non-object payloads", () => {
    expect(parseByokToolArguments('{"path":"src/App.tsx"}')).toEqual({ path: "src/App.tsx" });
    expect(() => parseByokToolArguments("[]")).toThrow("tool arguments must be a JSON object");
    expect(() => parseByokToolArguments("not-json")).toThrow("Invalid tool arguments");
  });

  it("describes terminal requests explicitly instead of silently executing them", () => {
    expect(isByokToolName("run_terminal_command")).toBe(true);
    expect(isByokToolName("delete_file")).toBe(false);
    expect(getByokToolDescription("run_terminal_command", {
      program: "git",
      args: ["status", "--short"],
    })).toEqual({
      description: "Run allowlisted command: git status --short",
      resource: "workspace terminal",
    });
  });
});
