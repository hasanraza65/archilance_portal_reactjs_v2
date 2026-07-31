import React from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { useNotifications } from "./useNotifications";
import { notificationLink } from "@/api/notifications";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const NATURE_ICON = {
  success: ["solar:check-circle-bold", "text-emerald-500"],
  warning: ["solar:danger-triangle-bold", "text-amber-500"],
  error: ["solar:close-circle-bold", "text-red-500"],
};

const NotificationsPage = () => {
  const { notifications, totalUnread, isLoading, markAll, markOne } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="pb-10">
      <PageHeader
        title="Notifications"
        subtitle={totalUnread > 0 ? `${totalUnread} unread` : "You're all caught up"}
        actions={
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <Button variant="secondary" size="sm" onClick={() => markAll()}>Mark all read</Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon="solar:settings-linear"
              onClick={() => navigate("/notification-settings")}
            >
              Email settings
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5">
        {isLoading ? (
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] divide-y divide-[var(--line-subtle)]">
            {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState icon="solar:bell-off-linear" title="No notifications" description="You'll see task and job updates here." />
        ) : (
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] divide-y divide-[var(--line-subtle)] overflow-hidden">
            {notifications.map((n) => {
              const [icon, color] = NATURE_ICON[n.notification_nature] || ["solar:bell-linear", "text-[var(--ink-tertiary)]"];
              return (
                <button
                  key={n.id}
                  onClick={() => { if (!n.is_read) markOne(n.id); navigate(notificationLink(n)); }}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-sunken)] transition-colors",
                    !n.is_read && "bg-primary-50/40 dark:bg-primary-500/5"
                  )}
                >
                  <Icon icon={icon} className={cn("text-[19px] mt-0.5 flex-none", color)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[var(--ink-primary)]">{n.notification_message}</span>
                    <span className="block text-xs text-[var(--ink-tertiary)] mt-0.5">{formatDateTime(n.created_at)}</span>
                  </span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-none mt-1.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
