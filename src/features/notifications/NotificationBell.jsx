import React from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import { SkeletonRow } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useNotifications } from "./useNotifications";
import { notificationLink } from "@/api/notifications";
import { formatRelativeDue } from "@/lib/format";
import { cn } from "@/lib/cn";

const NATURE_ICON = {
  success: ["solar:check-circle-bold", "text-emerald-500"],
  warning: ["solar:danger-triangle-bold", "text-amber-500"],
  error: ["solar:close-circle-bold", "text-red-500"],
};

const NotificationBell = () => {
  const { notifications, totalUnread, isLoading, markAll, markOne } = useNotifications();
  const navigate = useNavigate();

  return (
    <Popover className="relative">
      <PopoverButton className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink-primary)] transition-colors">
        <Icon icon="solar:bell-bold-duotone" className="text-xl" />
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger-500 text-white text-[9px] font-bold flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </PopoverButton>
      <PopoverPanel
        transition
        anchor="bottom end"
        className="z-50 w-[22rem] max-w-[92vw] mt-2 rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line-subtle)]">
          <span className="font-semibold text-sm">Notifications</span>
          {totalUnread > 0 && (
            <button onClick={() => markAll()} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div>
              {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState icon="solar:bell-off-linear" title="You're all caught up" description="No notifications right now." className="py-10" />
          ) : (
            notifications.slice(0, 8).map((n) => {
              const [icon, color] = NATURE_ICON[n.notification_nature] || ["solar:bell-linear", "text-[var(--ink-tertiary)]"];
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markOne(n.id);
                    navigate(notificationLink(n));
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-sunken)] transition-colors border-b border-[var(--line-subtle)] last:border-0",
                    !n.is_read && "bg-primary-50/40 dark:bg-primary-500/5"
                  )}
                >
                  <Icon icon={icon} className={cn("text-[18px] mt-0.5 flex-none", color)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[var(--ink-primary)] line-clamp-2">{n.notification_message}</span>
                    <span className="block text-[11px] text-[var(--ink-tertiary)] mt-0.5">{formatRelativeDue(n.created_at)}</span>
                  </span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-none mt-1.5" />}
                </button>
              );
            })
          )}
        </div>
        <button
          onClick={() => navigate("/notifications")}
          className="w-full text-center text-xs font-medium text-primary-600 dark:text-primary-400 py-2.5 border-t border-[var(--line-subtle)] hover:bg-[var(--surface-sunken)]"
        >
          View all
        </button>
      </PopoverPanel>
    </Popover>
  );
};

export default NotificationBell;
