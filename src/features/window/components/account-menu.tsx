import { useEffect, useRef, useState } from "react";
import { getServiceUrls } from "@/config/services";
import { useAIChatStore } from "@/features/ai/stores/ai-chat.store";
import { useUIState } from "@/features/window/stores/ui-state.store";
import { Button } from "@/ui/button";
import { Dropdown, MenuItemsList, type MenuItem } from "@/ui/dropdown";
import { BookOpenIcon, GearSixIcon, SparkleIcon } from "@/ui/icons";
import Tooltip from "@/ui/tooltip";

type AccountMenuProps = {
  className?: string;
};

/**
 * Coodi's top-right menu is intentionally local-only. There is no account,
 * login, subscription, billing, or hosted dashboard flow in this build.
 */
export const AccountMenu = ({ className }: AccountMenuProps) => {
  const services = getServiceUrls();
  const providerApiKeys = useAIChatStore((state) => state.providerApiKeys);
  const setIsSettingsDialogVisible = useUIState((state) => state.setIsSettingsDialogVisible);
  const openSettingsDialog = useUIState((state) => state.openSettingsDialog);
  const hasBlockingModalOpen = useUIState(
    (state) =>
      state.isQuickOpenVisible ||
      state.isCommandPaletteVisible ||
      state.isGlobalSearchVisible ||
      state.isSettingsDialogVisible ||
      state.isProjectPickerVisible ||
      state.isDatabaseConnectionVisible,
  );

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const configuredKeyCount = Array.from(providerApiKeys.values()).filter(Boolean).length;

  const openUrl = async (url: string) => {
    const { openUrl: openExternalUrl } = await import("@tauri-apps/plugin-opener");
    await openExternalUrl(url);
  };

  const openSettings = () => {
    setIsOpen(false);
    setIsSettingsDialogVisible(true);
  };

  const openAISettings = () => {
    setIsOpen(false);
    openSettingsDialog("ai");
  };

  const menuItems: MenuItem[] = [
    {
      id: "settings",
      label: "Settings",
      icon: <GearSixIcon />,
      onClick: openSettings,
    },
    {
      id: "ai-providers",
      label: configuredKeyCount > 0 ? `AI Providers (${configuredKeyCount} keys)` : "AI Providers",
      icon: <SparkleIcon />,
      onClick: openAISettings,
    },
    {
      id: "docs",
      label: "Documentation",
      icon: <BookOpenIcon />,
      onClick: () => void openUrl(services.docsUrl),
    },
  ];

  useEffect(() => {
    if (isOpen && hasBlockingModalOpen) setIsOpen(false);
  }, [hasBlockingModalOpen, isOpen]);

  return (
    <>
      <Tooltip content="Coodi" side="bottom">
        <Button
          ref={buttonRef}
          onClick={() => setIsOpen((open) => !open)}
          type="button"
          variant="ghost"
          size="icon-xs"
          active={isOpen}
          className={className}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Coodi menu"
        >
          <SparkleIcon className="size-4" />
        </Button>
      </Tooltip>
      <Dropdown
        isOpen={isOpen}
        anchorRef={buttonRef}
        anchorAlign="end"
        onClose={() => setIsOpen(false)}
        className="w-[240px] overflow-hidden rounded-xl p-0"
      >
        <div className="p-1">
          <div className="px-2.5 py-2 text-subtle-foreground ui-text-xs">
            Free and local-first. Add your own provider keys in AI Providers.
          </div>
          <MenuItemsList items={menuItems} onItemSelect={() => setIsOpen(false)} />
        </div>
      </Dropdown>
    </>
  );
};
