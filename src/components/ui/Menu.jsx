import React from "react";
import { Menu as HMenu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { cn } from "@/lib/cn";
import Icon from "./Icon";

/**
 * Quick action/kebab menu. Pass `items` as [{ label, icon, onClick, danger, disabled }]
 * or `"divider"` to insert a separator. `trigger` is any element (usually an IconButton).
 */
const Menu = ({ trigger, items = [], align = "right", className }) => (
  <HMenu as="div" className="relative inline-block text-left">
    <MenuButton as={React.Fragment}>{trigger}</MenuButton>
    <MenuItems
      transition
      anchor={align === "right" ? "bottom end" : "bottom start"}
      className={cn(
        "z-50 w-52 origin-top rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel p-1.5 focus:outline-none",
        "transition duration-100 ease-out data-[closed]:opacity-0 data-[closed]:scale-95",
        className
      )}
    >
      {items.map((item, i) =>
        item === "divider" ? (
          <div key={i} className="h-px my-1.5 bg-[var(--line-subtle)]" />
        ) : (
          <MenuItem key={item.label} disabled={item.disabled}>
            {({ focus }) => (
              <button
                type="button"
                onClick={item.onClick}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors disabled:opacity-40",
                  focus && "bg-[var(--surface-sunken)]",
                  item.danger ? "text-danger-500" : "text-[var(--ink-primary)]"
                )}
              >
                {item.icon && <Icon icon={item.icon} className="text-[15px] flex-none" />}
                {item.label}
              </button>
            )}
          </MenuItem>
        )
      )}
    </MenuItems>
  </HMenu>
);

export default Menu;
