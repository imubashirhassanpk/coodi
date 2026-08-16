import { describe, expect, it } from "vitest";
import { createToolCall, updateToolCall } from "@/features/ai/lib/tool-call-state";

describe("BYOK tool audit metadata", () => {
  it("keeps the provider, pending permission, and file preview on creation", () => {
    const toolCall = createToolCall(
      "write_file",
      { path: "src/App.tsx", content: "after" },
      "call-1",
      "edit",
      "in_progress",
      [{ path: "src/App.tsx" }],
      {
        provider: "byok",
        permissionStatus: "pending",
        preview: {
          kind: "file",
          path: "src/App.tsx",
          oldText: "before",
          newText: "after",
        },
      },
    );

    expect(toolCall).toMatchObject({
      id: "call-1",
      provider: "byok",
      permissionStatus: "pending",
      preview: { kind: "file", oldText: "before", newText: "after" },
    });
  });

  it("updates approval status and preserves the preview through completion", () => {
    const initial = createToolCall("create_file", { path: "new.ts", content: "x" }, "call-2", "edit", "in_progress", [], {
      provider: "byok",
      permissionStatus: "pending",
      preview: { kind: "file", path: "new.ts", oldText: "", newText: "x" },
    });
    const approved = updateToolCall([initial], {
      id: "call-2",
      permissionStatus: "approved",
      status: "completed",
      output: { created: true },
    });

    expect(approved[0]).toMatchObject({
      permissionStatus: "approved",
      status: "completed",
      isComplete: true,
      output: { created: true },
      preview: { path: "new.ts", newText: "x" },
    });
  });
});
