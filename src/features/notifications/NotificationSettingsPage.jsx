import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Toggle from "@/components/ui/Toggle";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { fetchNotificationPreferences, updateNotificationPreferences } from "@/api/notifications";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

// Purely presentational — the backend owns the catalog, so an unknown key just
// falls back to a bell rather than breaking the row.
const CATEGORY_ICON = {
  assignment: "solar:user-check-bold-duotone",
  status_change: "solar:refresh-bold",
  comment: "solar:chat-round-dots-bold-duotone",
  due_reminder: "solar:clock-circle-bold-duotone",
  chat_message: "solar:letter-bold-duotone",
  project_message: "solar:chat-square-bold-duotone",
};

const GROUP_META = {
  Work: { icon: "solar:case-round-bold-duotone", blurb: "Updates on jobs, projects and tasks you're part of." },
  Reminders: { icon: "solar:bell-bold-duotone", blurb: "Scheduled digests about upcoming deadlines." },
  Messages: { icon: "solar:chat-round-dots-bold-duotone", blurb: "Direct and project conversations." },
};

const NotificationSettingsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [savingKey, setSavingKey] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: fetchNotificationPreferences,
    staleTime: 60_000,
  });

  const categories = data?.categories || [];
  const prefs = data?.preferences || {};

  const save = useMutation({
    mutationFn: updateNotificationPreferences,
    // Optimistic: flip the switch instantly, roll it back only if the save fails.
    onMutate: async (nextPrefs) => {
      await qc.cancelQueries({ queryKey: ["notification-preferences"] });
      const previous = qc.getQueryData(["notification-preferences"]);
      qc.setQueryData(["notification-preferences"], (old) =>
        old ? { ...old, preferences: nextPrefs } : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notification-preferences"], ctx.previous);
      toast.error("Couldn't save that change. Please try again.");
    },
    // Trust the server's resolved map — it fills in any category we didn't send.
    onSuccess: (result) => qc.setQueryData(["notification-preferences"], result),
    onSettled: () => setSavingKey(null),
  });

  const toggle = (key) => {
    setSavingKey(key);
    save.mutate({ ...prefs, [key]: !prefs[key] });
  };

  const enabledCount = useMemo(
    () => categories.filter((c) => prefs[c.key]).length,
    [categories, prefs]
  );

  // Preserve the backend's ordering, grouping by first appearance.
  const grouped = useMemo(() => {
    const order = [];
    const byGroup = {};
    for (const c of categories) {
      const g = c.group || "Other";
      if (!byGroup[g]) {
        byGroup[g] = [];
        order.push(g);
      }
      byGroup[g].push(c);
    }
    return order.map((g) => ({ group: g, items: byGroup[g] }));
  }, [categories]);

  const setAll = (value) => {
    setSavingKey("__all__");
    save.mutate(Object.fromEntries(categories.map((c) => [c.key, value])));
  };

  return (
    <div className="pb-10">
      <PageHeader
        maxWidth="max-w-3xl"
        title="Email Notifications"
        subtitle={
          isLoading
            ? "Loading your preferences…"
            : `${enabledCount} of ${categories.length} categories on · changes save automatically`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon="solar:arrow-left-linear" onClick={() => navigate("/notifications")}>
              Notifications
            </Button>
            {!isLoading && !isError && categories.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                disabled={save.isPending}
                onClick={() => setAll(enabledCount !== categories.length)}
              >
                {enabledCount === categories.length ? "Turn all off" : "Turn all on"}
              </Button>
            )}
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-3xl mx-auto">
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] px-4 py-3 mb-5">
          <Icon icon="solar:bell-bold-duotone" className="text-[16px] text-primary-500 mt-0.5 flex-none" />
          <p className="text-xs text-[var(--ink-secondary)]">
            These control <strong className="text-[var(--ink-primary)]">emails only</strong>. Your in-app
            notifications keep working either way, so you'll never miss something inside the portal.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
          </div>
        ) : isError ? (
          <EmptyState
            icon="solar:danger-triangle-bold"
            title="Couldn't load your settings"
            description="Something went wrong fetching your notification preferences. Refresh and try again."
          />
        ) : categories.length === 0 ? (
          <EmptyState icon="solar:bell-off-linear" title="Nothing to configure" description="No notification categories are available." />
        ) : (
          <div className="space-y-4">
            {grouped.map(({ group, items }) => {
              const meta = GROUP_META[group] || { icon: "solar:bell-bold-duotone", blurb: null };
              return (
                <div key={group} className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
                  <div className="flex items-start gap-2.5 px-4 py-3 border-b border-[var(--line-subtle)]">
                    <span className="w-7 h-7 rounded-lg bg-primary-500/12 flex items-center justify-center flex-none">
                      <Icon icon={meta.icon} className="text-[14px] text-primary-500" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink-primary)]">{group}</p>
                      {meta.blurb && <p className="text-[11px] text-[var(--ink-tertiary)] mt-0.5">{meta.blurb}</p>}
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--line-subtle)]">
                    {items.map((c) => {
                      const on = Boolean(prefs[c.key]);
                      const busy = save.isPending && (savingKey === c.key || savingKey === "__all__");
                      return (
                        <label
                          key={c.key}
                          htmlFor={`notif-${c.key}`}
                          className="flex items-start justify-between gap-4 px-4 py-3.5 hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center flex-none transition-colors",
                                on
                                  ? "bg-primary-500/12 text-primary-600 dark:text-primary-400"
                                  : "bg-[var(--surface-sunken)] text-[var(--ink-tertiary)]"
                              )}
                            >
                              <Icon icon={CATEGORY_ICON[c.key] || "solar:bell-linear"} className="text-[17px]" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--ink-primary)]">{c.label}</p>
                              <p className="text-xs text-[var(--ink-secondary)] mt-0.5">{c.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-none pt-1">
                            {busy && <Spinner size={14} />}
                            <Toggle
                              id={`notif-${c.key}`}
                              checked={on}
                              disabled={save.isPending}
                              onChange={() => toggle(c.key)}
                              label={`${c.label} emails`}
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <p className="text-[11px] text-[var(--ink-tertiary)] text-center pt-1">
              You'll always receive essential account emails — password resets and contract requests —
              regardless of these settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
