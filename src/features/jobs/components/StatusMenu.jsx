import React from "react";
import { Menu as HMenu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { STATUS_OPTIONS, statusMeta } from "@/lib/statusMeta";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/cn";

const StatusMenu = ({ status, onChange, size = "sm", disabled = false }) => {
  const current = statusMeta(status);
  if (disabled) return <StatusPill status={status} size={size} />;

  return (
    <HMenu as="div" className="relative inline-block">
      <MenuButton as="div">
        <StatusPill status={status} size={size} onClick={() => {}} />
      </MenuButton>
      <MenuItems
        transition
        anchor="bottom start"
        className="z-50 w-48 mt-1 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel p-1.5 focus:outline-none transition duration-100 ease-out data-[closed]:opacity-0 data-[closed]:scale-95"
      >
        {STATUS_OPTIONS.map((opt) => (
          <MenuItem key={opt.value}>
            {({ focus }) => (
              <button
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors",
                  focus && "bg-[var(--surface-sunken)]",
                  opt.value === current.value && "font-semibold"
                )}
              >
                <span className="w-2 h-2 rounded-full flex-none" style={{ background: opt.color }} />
                {opt.label}
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </HMenu>
  );
};

export default StatusMenu;
