import { describe, expect, it } from "vite-plus/test";
import type { ExtensionManifest } from "../types/extension-manifest";
import { buildInstalledExtensionsMap } from "@/extensions/registry/extension-store-bootstrap";
import type { AvailableExtension } from "@/extensions/registry/extension-store-types";

function createAvailableExtension(manifest: ExtensionManifest): AvailableExtension {
  return {
    manifest,
    isInstalled: false,
    isEnabled: false,
    isInstalling: false,
    runtimeIssues: [],
  };
}

describe("extension-store bootstrap", () => {
  it("drops retired installed extensions before activation state is built", () => {
    const availableExtensions = new Map<string, AvailableExtension>([
      [
        "coodi.theme.market",
        createAvailableExtension({
          id: "coodi.theme.market",
          name: "Coodi Themes",
          displayName: "Coodi Theme Pack",
          description: "Retired theme pack",
          version: "1.0.0",
          publisher: "Coodi",
          categories: ["Theme"],
          themes: [
            {
              id: "market-light",
              name: "Coodi Light",
              appearance: "light",
              colors: {},
              syntax: {},
            },
          ],
        }),
      ],
      [
        "coodi.theme.vercel",
        createAvailableExtension({
          id: "coodi.theme.vercel",
          name: "vercel",
          displayName: "Vercel Theme",
          description: "Vercel theme",
          version: "1.0.0",
          publisher: "Coodi",
          categories: ["Theme"],
          installation: { type: "bundled" },
          themes: [
            {
              id: "vercel-light",
              name: "Vercel Light",
              appearance: "light",
              colors: {},
              syntax: {},
            },
          ],
        }),
      ],
    ]);

    const installedExtensions = buildInstalledExtensionsMap({
      backendInstalled: [
        {
          id: "coodi.theme.market",
          name: "Coodi Theme Pack",
          version: "1.0.0",
          installed_at: "2026-07-08T00:00:00.000Z",
          enabled: true,
        },
      ],
      indexedDBInstalled: [{ languageId: "coodi.theme.market", version: "1.0.0" }],
      bundledContributionInstalled: ["coodi.theme.market", "coodi.theme.vercel"],
      availableExtensions,
    });

    expect(installedExtensions.has("coodi.theme.market")).toBe(false);
    expect(installedExtensions.has("coodi.theme.vercel")).toBe(true);
  });
});
