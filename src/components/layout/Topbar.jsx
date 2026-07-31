import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import { useUI } from "@/store/UIContext";
import NotificationBell from "@/features/notifications/NotificationBell";
import VersionSwitchV2 from "@/features/versionSwitch/VersionSwitchV2";
import { cn } from "@/lib/cn";

/**
 * `left` renders breadcrumbs/page title (feature pages pass this via a portal-
 * like prop from their own header — kept simple here as a children slot).
 */
const Topbar = ({ children }) => {
  const { setCommandPaletteOpen, setMobileNavOpen, setQuickCreateOpen } = useUI();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 h-14 lg:h-16 flex items-center gap-2 px-3 lg:px-6 bg-[var(--surface-raised)]/85 backdrop-blur-md border-b border-[var(--line-subtle)]">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="lg:hidden w-9 h-9 flex-none flex items-center justify-center rounded-lg text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)]"
      >
        <Icon icon="solar:hamburger-menu-linear" className="text-xl" />
      </button>

      <div className="flex-1 min-w-0 flex items-center gap-2">{children}</div>

      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className={cn(
          "hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg text-sm text-[var(--ink-tertiary)]",
          "bg-[var(--surface-sunken)] hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors w-56 lg:w-72"
        )}
      >
        <Icon icon="solar:magnifer-linear" className="text-[16px]" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="text-[10px] font-sans px-1.5 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--line-subtle)]">
          ⌘K
        </kbd>
      </button>

      <IconButton icon="solar:magnifer-linear" size="md" className="sm:hidden" onClick={() => setCommandPaletteOpen(true)} label="Search" />

      {/* Renders nothing unless the signed-in role may switch versions. */}
      <VersionSwitchV2 compact />

      <NotificationBell />

      <button
        type="button"
        onClick={() => setQuickCreateOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors shadow-soft"
      >
        <Icon icon="solar:add-circle-bold" className="text-[16px]" />
        <span className="hidden sm:inline">New</span>
      </button>
    </header>
  );
};

export default Topbar;
