import React, { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { useChatContacts, useForwardMessage } from "../useChatData";
import { getMediaUrl } from "@/api/media";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";
import { cn } from "@/lib/cn";

/** Pick one or more contacts to resend a message to (text + attachments). */
const ForwardMessageModal = ({ open, message, onClose }) => {
  const { data: contacts = [] } = useChatContacts();
  const forward = useForwardMessage();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());

  const filtered = useMemo(
    () => contacts.filter((c) => c.name?.toLowerCase().includes(query.trim().toLowerCase())),
    [contacts, query]
  );

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const close = () => {
    setSelected(new Set());
    setQuery("");
    onClose();
  };

  const handleForward = async () => {
    if (!message || selected.size === 0) return;
    const contactIds = Array.from(selected);
    try {
      await forward.mutateAsync({ message, contactIds });
      toast.success(`Forwarded to ${contactIds.length} ${contactIds.length === 1 ? "person" : "people"}`);
      close();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to forward message."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Forward message"
      className="max-w-sm"
      footer={
        <div className="flex gap-2 w-full sm:w-auto">
          <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleForward}
            disabled={selected.size === 0}
            isLoading={forward.isPending}
            icon="solar:forward-linear"
            className="flex-1 sm:flex-none"
          >
            Forward{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </div>
      }
    >
      {message && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--surface-sunken)] text-xs text-[var(--ink-secondary)] truncate">
          {message.message || (message.attachments?.length ? "Attachment" : "")}
        </div>
      )}
      <div className="relative mb-3">
        <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[14px]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          className="w-full pl-8 pr-3 h-9 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-sunken)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </div>
      <div className="space-y-0.5 max-h-72 overflow-y-auto">
        {filtered.map((c) => {
          const checked = selected.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                checked ? "bg-primary-50 dark:bg-primary-500/10" : "hover:bg-[var(--surface-sunken)]"
              )}
            >
              <Avatar name={c.name} src={c.profile_pic ? getMediaUrl(c.profile_pic) : null} size="sm" />
              <span className="flex-1 min-w-0 text-sm text-[var(--ink-primary)] truncate">{c.name}</span>
              <span
                className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center flex-none",
                  checked ? "bg-primary-500 border-primary-500" : "border-[var(--line-strong)]"
                )}
              >
                {checked && <Icon icon="solar:check-read-linear" className="text-white text-[12px]" />}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-[var(--ink-tertiary)] text-center py-6">No matches.</p>}
      </div>
    </Modal>
  );
};

export default ForwardMessageModal;
