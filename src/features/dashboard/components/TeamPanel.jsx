import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";

import { getMediaUrl } from "@/api/media";
import { cn } from "@/lib/cn";

const parseHours = (str) => {
  if (!str) return 0;
  const h = /(\d+)h/.exec(str);
  const m = /(\d+)m/.exec(str);
  return (h ? +h[1] : 0) + (m ? +m[1] / 60 : 0);
};

/**
 * Live team snapshot for managers/supervisors/executives/admins:
 * who's tracking right now, and today/this-week hours per person.
 */
const TeamPanel = ({ members = [], isLoading }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const { online, ranked, totalToday } = useMemo(() => {
    const list = members.filter((m) => m.user_role === 3 || m.employee_type);
    const on = list.filter((m) => m.timer_status === "Online");
    const withHours = [...list].sort((a, b) => parseHours(b.today_time) - parseHours(a.today_time));
    const total = list.reduce((sum, m) => sum + parseHours(m.today_time), 0);
    return { online: on, ranked: withHours, totalToday: total };
  }, [members]);

  const visible = filter === "online" ? ranked.filter((m) => m.timer_status === "Online") : ranked;

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-subtle)]">
        <span className="w-6 h-6 rounded-md bg-primary-500/15 flex items-center justify-center flex-none">
          <Icon icon="solar:users-group-rounded-bold-duotone" className="text-[13px] text-primary-500" />
        </span>
        <span className="text-sm font-semibold text-[var(--ink-primary)] flex-1">Team today</span>
        <span className="text-[11px] text-[var(--ink-tertiary)]">
          {totalToday.toFixed(1)}h logged
        </span>
      </div>

      <div className="flex gap-1 px-3 py-2 border-b border-[var(--line-subtle)]">
        {[
          { key: "all", label: `All (${ranked.length})` },
          { key: "online", label: `Online (${online.length})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
              filter === f.key ? "bg-primary-500 text-white" : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-3 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-11 rounded-lg" />)}</div>
      ) : visible.length === 0 ? (
        <p className="text-xs text-[var(--ink-tertiary)] px-4 py-6 text-center">
          {filter === "online" ? "Nobody is tracking time right now." : "No team members found."}
        </p>
      ) : (
        <div className="max-h-[320px] overflow-y-auto divide-y divide-[var(--line-subtle)]">
          {visible.slice(0, 12).map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/work-diary/${m.id}`)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-[var(--surface-sunken)] transition-colors"
            >
              <div className="relative flex-none">
                <Avatar name={m.name} src={m.profile_pic ? getMediaUrl(m.profile_pic) : null} size="sm" />
                {m.timer_status === "Online" && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--surface-raised)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[var(--ink-primary)] truncate">{m.name}</span>
                <span className="block text-[11px] text-[var(--ink-tertiary)] truncate">{m.employee_type || "Employee"}</span>
              </div>
              <div className="text-right flex-none">
                <span className="block text-[12px] font-semibold text-[var(--ink-primary)]">{m.today_time || "0h 0m"}</span>
                <span className="block text-[10px] text-[var(--ink-tertiary)]">wk {m.week_time || "0h 0m"}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamPanel;
