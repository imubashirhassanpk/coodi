import { describe, expect, it } from "vite-plus/test";
import coodiThemes from "@/extensions/themes/builtin/coodi.json";
import {
  getCoodiDefaultColor,
  getCoodiDefaultCssVariables,
  getCoodiDefaultSyntaxColor,
  getCoodiDefaultSyntaxTokens,
  getCoodiDefaultTheme,
  getRequiredCoodiDefaultColor,
  getRequiredCoodiDefaultSyntaxColor,
} from "@/extensions/themes/default-theme";
import type { ThemeFile } from "@/extensions/themes/theme-schema";

const themeFile = coodiThemes as ThemeFile;

describe("Coodi default themes", () => {
  it("uses bundled coodi.json as the canonical default theme source", () => {
    const bundledDark = themeFile.themes.find((theme) => theme.id === "coodi-dark");
    const bundledLight = themeFile.themes.find((theme) => theme.id === "coodi-light");

    expect(getCoodiDefaultTheme("dark").colors).toEqual(bundledDark?.colors);
    expect(getCoodiDefaultTheme("light").syntax).toEqual(bundledLight?.syntax);
  });

  it("builds prefixed CSS and syntax variables from the same defaults", () => {
    expect(getCoodiDefaultCssVariables("dark")["--background"]).toBe(
      getCoodiDefaultColor("dark", "background"),
    );
    expect(getCoodiDefaultSyntaxTokens("dark")["--syntax-keyword"]).toBe(
      getCoodiDefaultSyntaxColor("dark", "keyword"),
    );
  });

  it("requires bundled default color names to exist", () => {
    expect(getRequiredCoodiDefaultColor("dark", "terminal-bright-blue")).toBe(
      getCoodiDefaultColor("dark", "terminal-bright-blue"),
    );
    expect(getRequiredCoodiDefaultSyntaxColor("light", "keyword")).toBe(
      getCoodiDefaultSyntaxColor("light", "keyword"),
    );
    expect(() => getRequiredCoodiDefaultColor("dark", "missing-color")).toThrow(
      "Missing Coodi dark default color: missing-color",
    );
  });

  it("exposes canonical raw theme variables without runtime aliases", () => {
    const definition = getCoodiDefaultTheme("light").definition;

    expect(definition.cssVariables["--background"]).toBe(
      getCoodiDefaultColor("light", "background"),
    );
    expect(definition.cssVariables["--color-background"]).toBeUndefined();
    expect(definition.syntaxTokens?.["--syntax-keyword"]).toBe(
      getCoodiDefaultSyntaxColor("light", "keyword"),
    );
    expect(definition.syntaxTokens?.["--color-syntax-keyword"]).toBeUndefined();
  });
});
