import { ArrowSquareOutIcon as ExternalLink } from "@/ui/icons";
import { Button } from "@/ui/button";
import Section, { SettingsView, SettingRow } from "../settings-section";

const COODI_WEBSITE_URL = "https://www.mubashirhassan.com/coodi";
const COODI_DOCS_URL = "https://www.mubashirhassan.com/coodi/docs";
const MUBASHIR_WEBSITE_URL = "https://www.mubashirhassan.com";

async function openExternalUrl(url: string) {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch (error) {
    console.error(`Failed to open ${url}:`, error);
  }
}

export const AboutSettings = () => {
  return (
    <SettingsView>
      <Section title="About Coodi">
        <div className="font-sans ui-text-base px-3 pb-1 text-subtle-foreground">
          Coodi is a focused desktop development environment for choosing AI providers, managing
          keys, and working with agents without leaving your workspace.
        </div>
        <SettingRow
          label="Coodi by Mubashir Hassan"
          description="Product information, downloads, and release notes."
        >
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => void openExternalUrl(COODI_WEBSITE_URL)}
          >
            <ExternalLink />
            <span>Visit website</span>
          </Button>
        </SettingRow>
        <SettingRow
          label="Documentation"
          description="Installation, AI configuration, and workflow guides."
        >
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => void openExternalUrl(COODI_DOCS_URL)}
          >
            <ExternalLink />
            <span>Open docs</span>
          </Button>
        </SettingRow>
        <SettingRow
          label="About Mubashir Hassan"
          description="AI SEO expert and full-stack developer based in Islamabad, Pakistan."
        >
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => void openExternalUrl(MUBASHIR_WEBSITE_URL)}
          >
            <ExternalLink />
            <span>About Mubashir</span>
          </Button>
        </SettingRow>
      </Section>
    </SettingsView>
  );
};
