import { getServiceUrls } from "@/config/services";
import Section, { SettingRow, SettingsView } from "../settings-section";

/**
 * Compatibility export for older extensions. This is an About page, not an
 * account page: Coodi has no sign-in, subscription, billing, or cloud sync.
 */
export const AccountSettings = () => {
  const services = getServiceUrls();

  return (
    <SettingsView>
      <Section title="About Coodi">
        <SettingRow label="Application" description="A free, local-first AI code builder.">
          <span className="font-sans ui-text-base font-medium text-foreground">Coodi</span>
        </SettingRow>
        <SettingRow
          label="Version"
          description="Based on the latest upstream Coodi-compatible release."
        >
          <span className="font-sans ui-text-base text-subtle-foreground">0.11.0</span>
        </SettingRow>
        <SettingRow
          label="Bring Your Own Key"
          description="Add your own OpenAI, OpenRouter, NVIDIA NIM, Anthropic, Gemini, Ollama, or custom provider key in Agent settings."
        >
          <span className="font-sans ui-text-base text-primary">BYOK only</span>
        </SettingRow>
        <SettingRow
          label="Accounts and subscriptions"
          description="Coodi does not require registration, login, billing, a subscription, or a hosted account."
        >
          <span className="font-sans ui-text-base text-subtle-foreground">Not used</span>
        </SettingRow>
        <SettingRow
          label="Project website"
          description="Read documentation, release information, and the project notice."
        >
          <a
            href={services.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="font-sans ui-text-base text-primary underline-offset-4 hover:underline"
          >
            mubashirhassan.com/coodi
          </a>
        </SettingRow>
      </Section>
      <Section title="Privacy">
        <SettingRow
          label="Local-first data"
          description="Projects, settings, and provider credentials stay on this device unless a provider request is made with your own key."
        >
          <span className="font-sans ui-text-base text-subtle-foreground">On device</span>
        </SettingRow>
      </Section>
    </SettingsView>
  );
};
