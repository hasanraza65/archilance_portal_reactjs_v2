import React, { useEffect, useRef, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import IconButton from "@/components/ui/IconButton";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import VoiceRecorderBar from "@/components/ui/VoiceRecorderBar";
import MessageBubble from "./MessageBubble";
import { useConversation } from "../useChatData";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { getMediaUrl } from "@/api/media";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";

const dayStamp = (v) => {
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toDateString() : "";
};
const isSameDay = (a, b) => dayStamp(a) === dayStamp(b);
const minutesApart = (a, b) => Math.abs(new Date(b) - new Date(a)) / 60000;

const dayLabel = (v) => {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};

const MessageThread = ({ contact, onBack }) => {
  const { user } = useAuth();
  const { messages, loading, sending, hasMore, loadMore, send, edit, remove, react, unreact } = useConversation(contact?.id);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const scrollRef = useRef(null);
  const voice = useVoiceRecorder();

  // Keep the newest message in view as the thread grows / conversation changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, contact?.id]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!text.trim() && !file) return;
    const body = text.trim();
    const attachments = file ? [file] : [];
    // Clear the composer immediately — the optimistic bubble is already rendered.
    setText("");
    setFile(null);
    setReplyTo(null);
    try {
      await send(body, { replyTo, attachments });
    } catch (err) {
      toast.error(extractErrorMessage(err, "Message failed to send."));
      setText(body); // give the text back so nothing is lost
    }
  };

  const startVoice = async () => {
    const ok = await voice.start();
    if (!ok && voice.error) toast.error(voice.error);
  };

  const sendVoice = async () => {
    const audio = await voice.stop();
    if (!audio) return;
    try {
      await send("", { replyTo, attachments: [audio] });
      setReplyTo(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Voice message failed to send."));
    }
  };

  if (!contact) {
    return <EmptyState icon="solar:chat-round-dots-linear" title="Select a conversation" description="Choose someone from the list to start chatting." className="h-full" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky conversation header — the one thing that must never scroll away. */}
      <div className="flex items-center gap-2 px-2 sm:px-4 h-14 flex-none border-b border-[var(--line-subtle)] bg-[var(--surface-raised)]">
        {onBack && (
          <IconButton icon="solar:alt-arrow-left-linear" label="Back to conversations" onClick={onBack} className="lg:hidden" />
        )}
        <Avatar name={contact.name} src={contact.profile_pic ? getMediaUrl(contact.profile_pic) : null} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[var(--ink-primary)] truncate">{contact.name}</p>
          {contact.email && <p className="text-[11px] text-[var(--ink-tertiary)] truncate">{contact.email}</p>}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-1.5">
        {hasMore && (
          <button onClick={loadMore} className="block mx-auto text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline mb-2">
            Load earlier messages
          </button>
        )}
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : messages.length === 0 ? (
          <EmptyState icon="solar:chat-round-dots-linear" title="No messages yet" description="Say hello 👋" className="py-16" />
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const isOwn = m.sender_id === user?.id;
            // A day chip whenever the calendar date changes, and bubble
            // grouping when the same person sends again within 5 minutes —
            // both straight out of the messenger playbook.
            const showDay = !prev || !isSameDay(prev.created_at, m.created_at);
            const grouped =
              !showDay &&
              prev &&
              prev.sender_id === m.sender_id &&
              minutesApart(prev.created_at, m.created_at) < 5;

            return (
              <React.Fragment key={m.id}>
                {showDay && (
                  <div className="flex justify-center py-2">
                    <span className="px-2.5 py-1 rounded-full bg-[var(--surface-sunken)] text-[11px] font-medium text-[var(--ink-tertiary)]">
                      {dayLabel(m.created_at)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={m}
                  isOwn={isOwn}
                  grouped={grouped}
                  currentUserId={user?.id}
                  onEdit={edit}
                  onDelete={remove}
                  onReply={setReplyTo}
                  onReact={react}
                  onUnreact={unreact}
                />
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="flex-none border-t border-[var(--line-subtle)] p-2.5 sm:p-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-[var(--surface-raised)]">
        {replyTo && !voice.recording && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-[var(--surface-sunken)] text-xs">
            <span className="truncate text-[var(--ink-secondary)]">Replying to: {replyTo.message}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-[var(--ink-tertiary)]"><Icon icon="solar:close-circle-linear" /></button>
          </div>
        )}
        {file && !voice.recording && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-[var(--surface-sunken)] text-xs">
            <span className="truncate">{file.name}</span>
            <button type="button" onClick={() => setFile(null)} className="text-[var(--ink-tertiary)]"><Icon icon="solar:close-circle-linear" /></button>
          </div>
        )}

        {voice.recording ? (
          <VoiceRecorderBar seconds={voice.seconds} level={voice.level} onCancel={voice.cancel} onSend={sendVoice} />
        ) : (
          <form onSubmit={submit} className="flex items-end gap-2">
            <IconButton icon="solar:paperclip-linear" size="md" label="Attach" onClick={() => fileRef.current?.click()} type="button" />
            <input ref={fileRef} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
              placeholder="Message"
              rows={1}
              className="flex-1 min-w-0 resize-none max-h-32 rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            {text.trim() || file ? (
              <IconButton icon="solar:plain-2-bold" variant="primary" size="md" label="Send" onClick={submit} disabled={sending} type="button" />
            ) : (
              <IconButton icon="solar:microphone-bold" variant="primary" size="md" label="Record voice message" onClick={startVoice} type="button" />
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default MessageThread;
