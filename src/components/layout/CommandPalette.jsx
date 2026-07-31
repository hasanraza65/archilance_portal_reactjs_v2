import React, { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useUI } from "@/store/UIContext";
import { useAuth } from "@/auth/AuthContext";
import { ALL_NAV_ITEMS } from "@/lib/nav";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import Icon from "@/components/ui/Icon";

const CommandPalette = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, toggleTheme, setQuickCreateOpen } = useUI();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useKeyboardShortcut({ key: "k", ctrlOrMeta: true }, () => setCommandPaletteOpen((o) => !o), [setCommandPaletteOpen]);
  useKeyboardShortcut({ key: "Escape" }, () => setCommandPaletteOpen(false), [setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [commandPaletteOpen]);

  const go = (path) => {
    navigate(path);
    setCommandPaletteOpen(false);
  };

  const navItems = ALL_NAV_ITEMS.filter((i) => i.roles.includes(user?.role));

  return (
    <Command.Dialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      label="Command palette"
      className="fixed inset-0 z-[100]"
      shouldFilter
    >
      <div
        className="fixed inset-0 bg-[var(--surface-overlay)] backdrop-blur-[2px]"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div className="fixed inset-x-0 top-[12vh] mx-auto w-full max-w-lg px-4">
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-float overflow-hidden animate-scale-in">
          <div className="flex items-center gap-2.5 px-4 border-b border-[var(--line-subtle)]">
            <Icon icon="solar:magnifer-linear" className="text-[var(--ink-tertiary)]" />
            <Command.Input
              autoFocus
              placeholder="Search pages, jobs, actions…"
              className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[var(--ink-tertiary)]"
            />
          </div>
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="py-10 text-center text-sm text-[var(--ink-tertiary)]">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigate" className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] [&_[cmdk-group-items]]:mt-1">
              {navItems.map((item) => (
                <Command.Item
                  key={item.link}
                  onSelect={() => go(item.link)}
                  className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm text-[var(--ink-primary)] cursor-pointer aria-selected:bg-[var(--surface-sunken)]"
                >
                  <Icon icon={item.icon} className="text-[16px] text-[var(--ink-secondary)]" />
                  {item.title}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Quick Actions" className="px-2 py-1.5 mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] [&_[cmdk-group-items]]:mt-1">
              <Command.Item
                onSelect={() => { setCommandPaletteOpen(false); setQuickCreateOpen(true); }}
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-[var(--surface-sunken)]"
              >
                <Icon icon="solar:add-circle-bold" className="text-[16px] text-primary-500" />
                Create a new task
              </Command.Item>
              <Command.Item
                onSelect={() => { toggleTheme(); setCommandPaletteOpen(false); }}
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-[var(--surface-sunken)]"
              >
                <Icon icon="solar:pallete-2-bold-duotone" className="text-[16px] text-[var(--ink-secondary)]" />
                Toggle dark / light mode
              </Command.Item>
              <Command.Item
                onSelect={() => { logout(); setCommandPaletteOpen(false); }}
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-[var(--surface-sunken)] text-danger-500"
              >
                <Icon icon="solar:logout-3-bold-duotone" className="text-[16px]" />
                Log out
              </Command.Item>
            </Command.Group>
          </Command.List>
        </div>
      </div>
    </Command.Dialog>
  );
};

export default CommandPalette;
