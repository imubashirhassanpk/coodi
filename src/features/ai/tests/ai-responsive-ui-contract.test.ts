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

  it("keeps the Agent message viewport as the flexible vertical scroll owner", () => {
    const source = readFileSync(`${aiComponentsDirectory}/chat/ai-chat.tsx`, "utf8");
    const agentTabSource = readFileSync(`${aiComponentsDirectory}/agent-tab.tsx`, "utf8");
    const scrollerSource = readFileSync(
      `${aiComponentsDirectory}/../../../ui/message-scroller.tsx`,
      "utf8",
    );

    expect(source).toContain(
      'font-sans flex h-0 min-h-0 min-w-0 w-full flex-1 select-none flex-col',
    );
    expect(source).toContain('className="h-0 min-h-0 min-w-0 flex-1"');
    expect(agentTabSource).toContain("size-full min-h-0 min-w-0 overflow-hidden");
    expect(scrollerSource).toContain(
      "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain",
    );
  });

  it("keeps the Prompt composer bounded and wrapping at narrow widths", () => {
    const source = readFileSync(`${aiComponentsDirectory}/input/chat-composer.tsx`, "utf8");

    expect(source).toContain("min-w-0 max-w-full shrink-0 overflow-visible");
    expect(source).toContain("flex min-w-0 max-w-full flex-wrap");
    expect(source).toContain("overflow-x-hidden overflow-y-auto");
    expect(readFileSync(`${aiComponentsDirectory}/chat/ai-chat.tsx`, "utf8")).toContain(
      'className="min-w-0 shrink-0"',
    );
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
