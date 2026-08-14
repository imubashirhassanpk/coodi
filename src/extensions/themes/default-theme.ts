import coodiThemes from "./builtin/coodi.json";
import { toThemeDefinition } from "./theme-file";
import type { ThemeFile } from "./theme-schema";
import type { ThemeDefinition } from "./theme.types";

export type CoodiDefaultThemeType = "dark" | "light";

interface CoodiDefaultTheme {
  id: string;
  type: CoodiDefaultThemeType;
  colors: Record<string, string>;
  syntax: Record<string, string>;
  definition: ThemeDefinition;
}

const coodiThemeFile = coodiThemes as ThemeFile;

function prefixRecord(prefix: string, value: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[`${prefix}${key}`] = entry;
  }
  return result;
}

function toStringRecord(value: object): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      result[key] = entry;
    }
  }
  return result;
}

function buildDefaultTheme(type: CoodiDefaultThemeType): CoodiDefaultTheme {
  const theme = coodiThemeFile.themes.find((entry) => entry.appearance === type);
  if (!theme) {
    throw new Error(`Missing Coodi ${type} default theme`);
  }

  return {
    id: theme.id,
    type,
    colors: toStringRecord(theme.colors),
    syntax: toStringRecord(theme.syntax ?? {}),
    definition: toThemeDefinition(theme),
  };
}

const COODI_DEFAULT_THEMES: Record<CoodiDefaultThemeType, CoodiDefaultTheme> = {
  dark: buildDefaultTheme("dark"),
  light: buildDefaultTheme("light"),
};

export function getCoodiDefaultTheme(type: CoodiDefaultThemeType): CoodiDefaultTheme {
  return COODI_DEFAULT_THEMES[type];
}

export function getCoodiDefaultCssVariables(type: CoodiDefaultThemeType): Record<string, string> {
  return prefixRecord("--", getCoodiDefaultTheme(type).colors);
}

export function getCoodiDefaultSyntaxTokens(type: CoodiDefaultThemeType): Record<string, string> {
  return prefixRecord("--syntax-", getCoodiDefaultTheme(type).syntax);
}

export function getCoodiDefaultColor(
  type: CoodiDefaultThemeType,
  name: string,
): string | undefined {
  return getCoodiDefaultTheme(type).colors[name];
}

export function getRequiredCoodiDefaultColor(type: CoodiDefaultThemeType, name: string): string {
  const color = getCoodiDefaultColor(type, name);
  if (!color) {
    throw new Error(`Missing Coodi ${type} default color: ${name}`);
  }

  return color;
}

export function getCoodiDefaultSyntaxColor(
  type: CoodiDefaultThemeType,
  name: string,
): string | undefined {
  return getCoodiDefaultTheme(type).syntax[name];
}

export function getRequiredCoodiDefaultSyntaxColor(
  type: CoodiDefaultThemeType,
  name: string,
): string {
  const color = getCoodiDefaultSyntaxColor(type, name);
  if (!color) {
    throw new Error(`Missing Coodi ${type} default syntax color: ${name}`);
  }

  return color;
}
