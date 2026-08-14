import type { IconThemeDefinition } from "./icon-theme.types";

function isLegacyCoodiIconTheme(theme: IconThemeDefinition) {
  return (
    theme.id === "coodi-icons-dimmed" ||
    theme.id === "coodi-icons-light" ||
    theme.id === "coodi-file-icons" ||
    theme.id === "coodi-file-icons-dark" ||
    theme.id === "coodi-file-icons-light" ||
    theme.name === "Coodi (Dark)" ||
    theme.name === "Coodi (Dimmed)" ||
    theme.name === "Coodi (Light)" ||
    theme.name === "Coodi File Icons"
  );
}

export function getVisibleIconThemes(themes: IconThemeDefinition[]) {
  return themes.filter((theme) => !isLegacyCoodiIconTheme(theme));
}
