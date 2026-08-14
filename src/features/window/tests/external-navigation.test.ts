import { describe, expect, it } from "vite-plus/test";
import { resolveExternalBrowserUrl } from "../utils/external-navigation";

describe("resolveExternalBrowserUrl", () => {
  it("accepts http and https links", () => {
    expect(resolveExternalBrowserUrl("https://www.mubashirhassan.com/coodi/docs")).toBe("https://www.mubashirhassan.com/coodi/docs");
    expect(resolveExternalBrowserUrl("http://localhost:3000")).toBe("http://localhost:3000/");
  });

  it("accepts mail and phone links", () => {
    expect(resolveExternalBrowserUrl("mailto:hello@www.mubashirhassan.com")).toBe("mailto:hello@www.mubashirhassan.com");
    expect(resolveExternalBrowserUrl("tel:+15551234567")).toBe("tel:+15551234567");
  });

  it("resolves protocol-relative links against the app protocol", () => {
    expect(resolveExternalBrowserUrl("//www.mubashirhassan.com/docs", "https://app.local/")).toBe(
      "https://www.mubashirhassan.com/docs",
    );
    expect(resolveExternalBrowserUrl("//www.mubashirhassan.com/docs", "tauri://localhost/")).toBe(
      "https://www.mubashirhassan.com/docs",
    );
  });

  it("does not treat in-app relative links as external", () => {
    expect(resolveExternalBrowserUrl("/settings", "http://localhost/")).toBe(null);
    expect(resolveExternalBrowserUrl("#section", "http://localhost/")).toBe(null);
  });

  it("rejects unsupported protocols", () => {
    expect(resolveExternalBrowserUrl("javascript:alert(1)")).toBe(null);
    expect(resolveExternalBrowserUrl("file:///Users/test/readme.md")).toBe(null);
    expect(resolveExternalBrowserUrl("coodi://open?path=/tmp/test.md")).toBe(null);
  });
});
