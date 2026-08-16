import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const aiComponentsDirectory = fileURLToPath(new URL("../components", import.meta.url));
const settingsComponentsDirectory = fileURLToPath(
  new URL("../../settings/components", import.meta.url),
);

describe("AI responsive UI contract", () => {
  it("keeps Agent message search usable at narrow widths", () => {
    const source = readFileSync(`${aiComponentsDirectory}/chat/chat-header.tsx`, "utf8");

    expect(source).toContain('className="h-7 min-w-0 flex-1 bg-surface/45"');
  });

  it("constrains Agent, Provider, Mode, and Model menus to the viewport", () => {
    const source = readFileSync(
      `${aiComponentsDirectory}/input/chat-preferences-menu.tsx`,
      "utf8",
    );

    expect(source).toContain("max-w-[calc(100vw-1rem)]");
    expect(source).toContain("max-h-[min(70vh,32rem)]");
    expect(source).toContain("max-h-[min(70vh,32rem)] min-w-64");
  });

  it("keeps model selector menus bounded by available width", () => {
    const source = readFileSync(
      `${aiComponentsDirectory}/selectors/model-selector.tsx`,
      "utf8",
    );

    expect(source).toContain('menuClassName="w-fit min-w-0 max-w-(--available-width) p-0"');
    expect(source).toContain("allowCustomValue");
  });

  it("keeps every Settings tab content surface shrinkable and full width", () => {
    const source = readFileSync(
      `${settingsComponentsDirectory}/settings-section.tsx`,
      "utf8",
    );

    expect(source).toContain('"w-full min-w-0"');
    expect(source).toContain("@max-[640px]/settings:flex-col");
    expect(source).toContain("@max-[640px]/settings:w-full");
  });
});
