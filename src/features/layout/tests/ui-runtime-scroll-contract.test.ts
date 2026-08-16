import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("workbench runtime and scroll contracts", () => {
  it("removes bottom-pane layout space when hidden", () => {
    const source = read("src/features/layout/components/bottom-pane/bottom-pane.tsx");
    expect(source).toContain('className={cn("shrink-0 flex-col", isBottomPaneVisible ? "flex" : "hidden")}');
    expect(source).toContain("height: isBottomPaneVisible ? `calc(${height}px + var(--coodi-workbench-gap))` : 0");
    expect(source).toContain("aria-hidden={!isBottomPaneVisible}");
  });

  it("keeps Extensions list and detail panes as bounded scroll owners", () => {
    const source = read("src/extensions/ui/components/extensions-sidebar.tsx");
    expect(source).toContain("min-w-0 flex-col overflow-hidden bg-background");
    expect(source).toContain("grid h-0 min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden");
    expect(source).toContain('className="h-full min-h-0 min-w-0 border-border/70 border-r"');
    expect(source).toContain('className="hidden h-full min-h-0 min-w-0 bg-surface/25 lg:block"');
  });

  it("installs a language extension even when optional runtimes are unavailable", () => {
    const source = read("src/extensions/registry/extension-store-lifecycle.ts");
    expect(source).toContain("const resolvedTools = await resolveToolPaths");
    expect(source).toContain("onLanguageInstalled(runtimeManifest, resolvedTools.issues)");
    expect(source).not.toContain("throw new Error(runtimeIssue)");
  });
});
