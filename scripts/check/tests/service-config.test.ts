import { describe, expect, it } from "vitest";
import { getServiceConfigErrors, type Services } from "../service-config";

const services: Services = {
  websiteBaseUrl: "https://www.mubashirhassan.com/coodi",
  stableUpdateUrl: "https://www.mubashirhassan.com/coodi/api/releases/stable",
  previewUpdateUrl: "https://www.mubashirhassan.com/coodi/api/releases/preview",
};

function validInput() {
  return {
    services,
    stable: {
      app: { security: { csp: "default-src 'self' https://www.mubashirhassan.com/coodi" } },
      plugins: { updater: { endpoints: [services.stableUpdateUrl] } },
    },
    preview: {
      plugins: { updater: { endpoints: [services.previewUpdateUrl] } },
    },
    capability: {
      permissions: [{ allow: [{ url: `${services.websiteBaseUrl}/**` }] }],
    },
  };
}

describe("service configuration", () => {
  it("accepts matching HTTPS service configuration", () => {
    expect(getServiceConfigErrors(validInput())).toEqual([]);
  });

  it("reports mismatched updater and capability configuration", () => {
    const input = validInput();
    input.preview.plugins.updater.endpoints = ["https://example.com/preview"];
    input.capability.permissions = [];

    expect(getServiceConfigErrors(input)).toEqual([
      "Preview Tauri updater endpoint does not match src/config/services.json.",
      "Tauri capabilities do not allow the configured Coodi website origin.",
    ]);
  });
});
