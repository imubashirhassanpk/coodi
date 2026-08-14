import { describe, expect, it } from "vite-plus/test";
import {
  filterRetiredExtensions,
  isRetiredExtensionId,
} from "@/extensions/registry/retired-extensions";

describe("retired extensions", () => {
  it("retires the marketplace Coodi theme pack", () => {
    expect(isRetiredExtensionId("coodi.theme.market")).toBe(true);
    expect(isRetiredExtensionId("coodi.theme.vercel")).toBe(false);
  });

  it("filters retired extensions from marketplace and installed extension lists", () => {
    expect(
      filterRetiredExtensions([
        { id: "coodi.theme.market", name: "Coodi Theme Pack" },
        { id: "coodi.theme.vercel", name: "Vercel Theme" },
      ]),
    ).toEqual([{ id: "coodi.theme.vercel", name: "Vercel Theme" }]);
  });
});
