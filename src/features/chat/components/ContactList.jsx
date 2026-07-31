import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import EmptyState from "@/components/ui/EmptyState";
import { getMediaUrl } from "@/api/media";
import { formatRelativeDue } from "@/lib/format";
import { cn } from "@/lib/cn";

const ContactList = ({ contacts = [], isLoading, activeId }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = contacts.filter((c) => c.name?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col h-full min-h-0 lg:border-r border-[var(--line-subtle)]">
      <div className="p-3 border-b border-[var(--line-subtle)]">
        <div className="relative">
          <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[14px]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            className="w-full pl-8 pr-3 h-10 sm:h-9 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-sunken)] text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="solar:users-group-rounded-linear" title="No contacts" className="py-16" />
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/chat/${c.id}`)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 hover:bg-[var(--surface-sunken)] transition-colors text-left",
                String(activeId) === String(c.id) && "bg-primary-500/10"
              )}
            >
              <div className="relative flex-none">
                <Avatar name={c.name} src={c.profile_pic ? getMediaUrl(c.profile_pic) : null} size="md" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--ink-primary)] truncate">{c.name}</span>
                  {c.last_message_at && <span className="text-[10px] text-[var(--ink-tertiary)] flex-none">{formatRelativeDue(c.last_message_at)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--ink-tertiary)] truncate">{c.last_message || "No messages yet"}</span>
                  {c.unread_count > 0 && (
                    <span className="flex-none min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {c.unread_count > 9 ? "9+" : c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactList;
