import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const sourceRoot = fileURLToPath(new URL("../../../../", import.meta.url));

function readSource(relativePath: string) {
  return readFileSync(`${sourceRoot}/${relativePath}`, "utf8");
}

describe("browser preview compatibility contract", () => {
  it("mounts React independently of optional Tauri terminal-session setup", () => {
    const source = readSource("src/main.tsx");

    expect(source).toContain("void Promise.resolve()");
    expect(source).toContain("createRoot(document.getElementById(\"root\")!).render(<App />);");
    expect(source).not.toContain(".finally(() => {");
  });

  it("guards browser-incompatible startup and workspace window lookups", () => {
    const startupSource = readSource("src/features/bootstrap/startup-performance.ts");
    const workspaceTabsSource = readSource("src/features/window/stores/workspace-tabs.store.ts");
    const menuSource = readSource("src/features/window/hooks/use-menu-events-wrapper.ts");

    expect(startupSource).toContain("try {");
    expect(startupSource).toContain("return false;");
    expect(workspaceTabsSource).toContain("try {");
    expect(workspaceTabsSource).toContain("return null;");
    expect(menuSource).toContain("currentWindowLabel = getCurrentWebviewWindow().label;");
    expect(menuSource).toContain("return;");
  });
});
