import React from "react";
import { Menu as HMenu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { PRIORITY_OPTIONS, priorityMeta } from "@/lib/statusMeta";
import { PriorityPill } from "@/components/ui/StatusPill";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const PriorityMenu = ({ priority, onChange, size = "sm", disabled = false, showLabel = false }) => {
  const current = priorityMeta(priority);
  if (disabled) return <PriorityPill priority={priority} size={size} showLabel={showLabel} />;

  return (
    <HMenu as="div" className="relative inline-block">
      <MenuButton as="div">
        <PriorityPill priority={priority} size={size} showLabel={showLabel} onClick={() => {}} />
      </MenuButton>
      <MenuItems
        transition
        anchor="bottom start"
        className="z-50 w-44 mt-1 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel p-1.5 focus:outline-none transition duration-100 ease-out data-[closed]:opacity-0 data-[closed]:scale-95"
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <MenuItem key={opt.value}>
            {({ focus }) => (
              <button
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors",
                  focus && "bg-[var(--surface-sunken)]",
                  opt.value === current?.value && "font-semibold"
                )}
              >
                <Icon icon={opt.icon} className="text-[14px]" style={{ color: opt.color }} />
                {opt.label}
              </button>
            )}
          </MenuItem>
        ))}
        {current && (
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={() => onChange(null)}
                className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left text-[var(--ink-tertiary)]", focus && "bg-[var(--surface-sunken)]")}
              >
                <Icon icon="solar:close-circle-linear" className="text-[14px]" />
                Clear priority
              </button>
            )}
          </MenuItem>
        )}
      </MenuItems>
    </HMenu>
  );
};

export default PriorityMenu;
