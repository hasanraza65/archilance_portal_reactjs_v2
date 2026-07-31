import React, { useEffect, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import IconButton from "@/components/ui/IconButton";
import EmptyState from "@/components/ui/EmptyState";
import Spinner from "@/components/ui/Spinner";
import { fetchProjectChat, sendProjectChatMessage, deleteProjectChatMessage } from "@/api/chat";
import { useAuth } from "@/auth/AuthContext";
import { getMediaUrl } from "@/api/media";
import { formatDateTime } from "@/lib/format";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

/**
 * Per-job group chat. Polled every 20s (matches v1 — the backend has no socket
 * channel for this feed), not real-time via socket like 1:1 chat.
 *
 * Like task comments, a job has TWO threads split by `allowed_customer`:
 *   scope="internal" (0) — staff only,  GET /project-chat/{id}
 *   scope="client"   (1) — shared with the customer,
 *                          staff: GET /project-chat-with-customers/{id}
 *                          customer: GET /customer/project-chat/{id}
 * A customer's own endpoints are hardwired to allowed_customer = 1 server-side,
 * so they can only ever read or write the shared thread.
 */
const ProjectChatPanel = ({ projectId, scope = "internal" }) => {
  const { user } = useAuth();
  const isClientThread = scope === "client";
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const res = await fetchProjectChat(user.role, projectId, { forCustomers: isClientThread });
      setMessages(res.data?.chats || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, scope]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendProjectChatMessage(user.role, {
        projectId,
        message: text.trim(),
        allowedCustomer: isClientThread,
      });
      setText("");
      await load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't send the message."));
    } finally {
      setSending(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteProjectChatMessage(user.role, id);
      await load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't delete the message."));
    }
  };

  return (
    <div className="flex flex-col h-[520px] rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon="solar:chat-round-dots-linear"
            title="No messages yet"
            description={
              isClientThread
                ? "Nothing shared with the customer yet — anything sent here is visible to them."
                : "Start the internal conversation about this job."
            }
            className="py-14"
          />
        ) : (
          messages.map((m) => {
            const isOwn = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn("group flex gap-2 max-w-[85%]", isOwn ? "ml-auto flex-row-reverse" : "")}>
                <Avatar name={m.sender?.name} src={m.sender?.profile_pic ? getMediaUrl(m.sender.profile_pic) : null} size="xs" />
                <div>
                  <div className={cn("px-3 py-2 rounded-2xl text-sm", isOwn ? "bg-primary-500 text-white rounded-br-md" : "bg-[var(--surface-sunken)] rounded-bl-md")}>
                    {m.message}
                  </div>
                  <div className={cn("flex items-center gap-2 mt-0.5", isOwn && "justify-end")}>
                    <span className="text-[10px] text-[var(--ink-tertiary)]">{formatDateTime(m.created_at)}</span>
                    {isOwn && (
                      <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-[10px] text-danger-500 transition-opacity">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={submit} className="border-t border-[var(--line-subtle)] p-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isClientThread ? "Message the customer…" : "Internal — the customer won't see this…"}
          className="flex-1 h-10 px-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
        <IconButton icon="solar:plain-2-bold" variant="primary" size="md" label="Send" onClick={submit} disabled={sending} />
      </form>
    </div>
  );
};

export default ProjectChatPanel;
