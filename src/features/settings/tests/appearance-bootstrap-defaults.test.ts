import { describe, expect, it } from "vite-plus/test";
import {
  getCoodiDefaultColor,
  getCoodiDefaultSyntaxColor,
} from "@/extensions/themes/default-theme";
import {
  COODI_BOOTSTRAP_DEFAULTS,
  DEFAULT_APPEARANCE_BOOTSTRAP_CACHE,
} from "../lib/appearance-bootstrap";

describe("appearance bootstrap defaults", () => {
  it("uses the bundled Coodi dark theme for startup CSS variables", () => {
    expect(DEFAULT_APPEARANCE_BOOTSTRAP_CACHE.themeId).toBe("coodi-dark");
    expect(DEFAULT_APPEARANCE_BOOTSTRAP_CACHE.themeType).toBe("dark");
    expect(DEFAULT_APPEARANCE_BOOTSTRAP_CACHE.cssVariables["--background"]).toBe(
      getCoodiDefaultColor("dark", "background"),
    );
    expect(DEFAULT_APPEARANCE_BOOTSTRAP_CACHE.syntaxTokens["--syntax-keyword"]).toBe(
      getCoodiDefaultSyntaxColor("dark", "keyword"),
    );
  });

  it("keeps bootstrap theme metadata aligned with Coodi defaults", () => {
    expect(COODI_BOOTSTRAP_DEFAULTS.light.colors.background).toBe(
      getCoodiDefaultColor("light", "background"),
    );
    expect(COODI_BOOTSTRAP_DEFAULTS.dark.syntax.keyword).toBe(
      getCoodiDefaultSyntaxColor("dark", "keyword"),
    );
  });
});
