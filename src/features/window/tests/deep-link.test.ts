import { describe, expect, it } from "vite-plus/test";
import { __test__ } from "../hooks/use-deep-link";

const { isSupportedDeepLinkProtocol, parseDeepLinkAction } = __test__;

describe("isSupportedDeepLinkProtocol", () => {
  it("accepts registered stable, preview, and dev schemes", () => {
    expect(isSupportedDeepLinkProtocol("coodi:")).toBe(true);
    expect(isSupportedDeepLinkProtocol("coodi-preview:")).toBe(true);
    expect(isSupportedDeepLinkProtocol("coodi-dev:")).toBe(true);
  });

  it("rejects unrelated schemes", () => {
    expect(isSupportedDeepLinkProtocol("https:")).toBe(false);
    expect(isSupportedDeepLinkProtocol("file:")).toBe(false);
    expect(isSupportedDeepLinkProtocol("coodi-alpha:")).toBe(false);
  });
});

describe("parseDeepLinkAction", () => {
  it("maps supported open URLs to queued window requests", () => {
    expect(parseDeepLinkAction("coodi://open?path=/Users/test/project/file.ts&line=42")).toEqual({
      type: "windowOpen",
      request: {
        type: "path",
        source: "deepLink",
        path: "/Users/test/project/file.ts",
        isDirectory: false,
        line: 42,
      },
    });
  });

  it("maps extension install URLs without touching extension state", () => {
    expect(parseDeepLinkAction("coodi://extension/install/theme-dark")).toEqual({
      type: "extensionInstall",
      extensionId: "theme-dark",
    });
  });

  it("maps settings URLs to settings dialog actions", () => {
    expect(parseDeepLinkAction("coodi://settings?tab=features")).toEqual({
      type: "settings",
      tab: "advanced",
      extensionsCategory: undefined,
    });

    expect(parseDeepLinkAction("coodi://settings?tab=advanced")).toEqual({
      type: "settings",
      tab: "advanced",
      extensionsCategory: undefined,
    });
  });

  it("maps legacy extension settings URLs to the extensions tab", () => {
    expect(parseDeepLinkAction("coodi://settings?tab=extensions&category=agent")).toEqual({
      type: "extensions",
      extensionsCategory: "agent",
    });

    expect(parseDeepLinkAction("coodi://open?type=settings&tab=extensions")).toEqual({
      type: "extensions",
      extensionsCategory: undefined,
    });
  });

  it("drops unsupported schemes and malformed actions", () => {
    expect(parseDeepLinkAction("coodi-alpha://open?path=/Users/test/file.ts")).toBeNull();
    expect(parseDeepLinkAction("coodi://open")).toBeNull();
  });
});
