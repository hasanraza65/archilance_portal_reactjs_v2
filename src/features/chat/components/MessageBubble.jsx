import React, { useState } from "react";
import Icon from "@/components/ui/Icon";
import Menu from "@/components/ui/Menu";
import IconButton from "@/components/ui/IconButton";
import AudioPlayer from "@/components/ui/AudioPlayer";
import { getAttachmentUrl } from "@/api/media";
import { cn } from "@/lib/cn";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const isVoiceNote = (a) =>
  /^audio\//i.test(a?.file_type || "") ||
  /\.(webm|m4a|mp3|ogg|wav)$/i.test(a?.file_name || a?.file_path || "");

const timeOnly = (v) => {
  const d = new Date(v);
  return Number.isFinite(d.getTime())
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";
};

const MessageBubble = ({ message, isOwn, grouped = false, onEdit, onDelete, onReply, onReact, onUnreact, currentUserId }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.message);

  const myReaction = (message.reactions || []).find((r) => r.user_id === currentUserId);

  const saveEdit = () => {
    setEditing(false);
    if (draft.trim() && draft !== message.message) onEdit(message.id, draft.trim());
  };

  return (
    <div
      className={cn(
        "group flex gap-2 max-w-[85%] sm:max-w-[80%]",
        isOwn ? "ml-auto flex-row-reverse" : "",
        // Consecutive messages from the same person sit closer together.
        grouped ? "mt-0.5" : "mt-2"
      )}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {message.parent && (
          <div className={cn("text-[11px] px-2.5 py-1.5 rounded-lg bg-[var(--surface-sunken)] text-[var(--ink-tertiary)] border-l-2 border-primary-400 max-w-full truncate", isOwn && "self-end")}>
            {message.parent.message}
          </div>
        )}

        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="px-3 py-2 rounded-2xl text-sm border border-primary-300 bg-[var(--surface-raised)] min-w-[180px]"
            />
            <IconButton icon="solar:check-circle-bold" size="xs" onClick={saveEdit} label="Save" />
          </div>
        ) : (
          <div
            className={cn(
              "px-3.5 py-2 rounded-2xl text-sm leading-snug relative",
              isOwn ? "bg-primary-500 text-white rounded-br-md" : "bg-[var(--surface-sunken)] text-[var(--ink-primary)] rounded-bl-md",
              message.__pending && "opacity-70"
            )}
          >
            <span className="whitespace-pre-wrap break-words">{message.message}</span>
            {/* Optimistic placeholder while a voice note / file is uploading. */}
            {message.__pending && message.__hasAttachment && (
              <span className={cn("flex items-center gap-1.5 text-xs", isOwn ? "text-white/80" : "text-[var(--ink-tertiary)]")}>
                <Icon icon="svg-spinners:180-ring" className="text-[13px]" /> Sending attachment…
              </span>
            )}
            {message.attachments?.map((a) =>
              isVoiceNote(a) ? (
                <AudioPlayer key={a.id} src={getAttachmentUrl(a.file_path, a.created_at)} tone={isOwn ? "dark" : "light"} />
              ) : (
                <a key={a.id} href={getAttachmentUrl(a.file_path, a.created_at)} target="_blank" rel="noopener noreferrer" className={cn("block mt-1.5 text-xs underline", isOwn ? "text-white/90" : "text-primary-600")}>
                  <Icon icon="solar:paperclip-linear" className="inline mr-1" />{a.file_name || "Attachment"}
                </a>
              )
            )}
            {/* Timestamp tucked into the bubble's trailing edge. */}
            <span
              className={cn(
                "float-right ml-2 mt-1 text-[10px] leading-none select-none",
                isOwn ? "text-white/70" : "text-[var(--ink-tertiary)]"
              )}
            >
              {message.__pending ? "…" : timeOnly(message.created_at)}
            </span>
          </div>
        )}

        {message.reactions?.length > 0 && (
          <div className={cn("flex gap-1 flex-wrap", isOwn && "justify-end")}>
            {Object.entries(
              message.reactions.reduce((acc, r) => { acc[r.reaction] = (acc[r.reaction] || 0) + 1; return acc; }, {})
            ).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => (myReaction?.reaction === emoji ? onUnreact(message.id) : onReact(message.id, emoji))}
                className={cn(
                  "text-[11px] px-1.5 py-0.5 rounded-full border",
                  myReaction?.reaction === emoji ? "bg-primary-50 border-primary-300 dark:bg-primary-500/15" : "bg-[var(--surface-sunken)] border-[var(--line-subtle)]"
                )}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        {message.__pending && (
          <span className={cn("text-[10px] text-[var(--ink-tertiary)] flex items-center gap-1", isOwn && "justify-end")}>
            <Icon icon="solar:clock-circle-linear" className="text-[10px]" /> Sending…
          </span>
        )}
      </div>

      {/* Actions are meaningless until the server has assigned a real id. */}
      <div
        className={cn(
          "relative flex-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-start gap-0.5 pt-1",
          message.__pending && "hidden"
        )}
      >
        <div className="relative">
          <IconButton icon="solar:sticker-smile-circle-linear" size="xs" label="React" onClick={() => setShowReactions((s) => !s)} />
          {showReactions && (
            <div className="absolute z-20 top-full mt-1 flex gap-1 p-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--line-subtle)] shadow-panel">
              {QUICK_REACTIONS.map((e) => (
                <button key={e} onClick={() => { onReact(message.id, e); setShowReactions(false); }} className="hover:scale-125 transition-transform text-base">{e}</button>
              ))}
            </div>
          )}
        </div>
        <IconButton icon="solar:reply-linear" size="xs" label="Reply" onClick={() => onReply(message)} />
        {isOwn && (
          <Menu
            trigger={<IconButton icon="solar:menu-dots-bold" size="xs" label="More" />}
            items={[
              { label: "Edit", icon: "solar:pen-linear", onClick: () => setEditing(true) },
              { label: "Delete", icon: "solar:trash-bin-trash-linear", danger: true, onClick: () => onDelete(message.id) },
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
