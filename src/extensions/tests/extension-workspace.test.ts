import { describe, expect, it } from "vite-plus/test";
import { getReservedBuiltInThemeContribution } from "@/extensions/tooling/extension-workspace";

describe("extension workspace theme ownership", () => {
  it("reserves Coodi default theme identities for built-in themes", () => {
    expect(
      getReservedBuiltInThemeContribution({
        id: "market-light",
        name: "Coodi Light",
      }),
    ).toEqual({ id: "market-light", name: "coodi light" });

    expect(
      getReservedBuiltInThemeContribution({
        id: "coodi-dark",
        name: "Custom Dark",
      }),
    ).toEqual({ id: "coodi-dark", name: "custom dark" });
  });

  it("allows non-Coodi marketplace theme identities", () => {
    expect(
      getReservedBuiltInThemeContribution({
        id: "vercel-light",
        name: "Vercel Light",
      }),
    ).toBeNull();
  });
});
