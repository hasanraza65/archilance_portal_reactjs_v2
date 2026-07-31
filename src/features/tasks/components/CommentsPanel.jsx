import React, { useRef, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Spinner from "@/components/ui/Spinner";
import AudioPlayer from "@/components/ui/AudioPlayer";
import VoiceRecorderBar from "@/components/ui/VoiceRecorderBar";
import { MAX_FILE_BYTES, fileKind, formatBytes } from "@/components/ui/FilePicker";
import { useComments } from "../useComments";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { getMediaUrl, getAttachmentUrl } from "@/api/media";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

const isVoiceAttachment = (a) =>
  /^audio\//i.test(a?.file_type || "") ||
  /\.(webm|m4a|mp3|ogg|wav)$/i.test(a?.file_name || a?.file_path || "");

const CommentItem = ({ comment }) => (
  <div className={cn("flex items-start gap-2.5 py-2.5", comment.__pending && "opacity-70")}>
    <Avatar name={comment.sender?.name} src={comment.sender?.profile_pic ? getMediaUrl(comment.sender.profile_pic) : null} size="sm" />
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[13px] font-semibold text-[var(--ink-primary)]">{comment.sender?.name || "Someone"}</span>
        <span className="text-[11px] text-[var(--ink-tertiary)]">
          {comment.__pending ? "Sending…" : formatDateTime(comment.created_at)}
        </span>
      </div>
      {comment.comment_message && (
        <p className="text-[13.5px] text-[var(--ink-secondary)] whitespace-pre-wrap mt-0.5">{comment.comment_message}</p>
      )}
      {comment.__pending && comment.__hasAttachment && (
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--ink-tertiary)] mt-1">
          <Spinner size={11} /> Uploading…
        </span>
      )}
      {comment.comment_attachments?.map((a) =>
        isVoiceAttachment(a) ? (
          <div key={a.id} className="mt-1.5"><AudioPlayer src={getAttachmentUrl(a.file_path, a.created_at)} /></div>
        ) : (
          <a
            key={a.id}
            href={getAttachmentUrl(a.file_path, a.created_at)}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-1.5 text-[11px] text-primary-600 dark:text-primary-400 underline"
          >
            <Icon icon="solar:paperclip-linear" className="inline mr-1 text-[11px]" />
            {a.file_name || "Attachment"}
          </a>
        )
      )}
    </div>
  </div>
);

const CommentComposer = ({ onSend, posting, placeholder }) => {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState([]);
  const fileRef = useRef(null);
  const voice = useVoiceRecorder();

  const submit = (e) => {
    e?.preventDefault();
    // A comment with only files and no text is legitimate, so allow either.
    if ((!value.trim() && files.length === 0) || posting) return;
    onSend(value.trim(), files.length ? { attachments: files } : undefined);
    setValue("");
    setFiles([]);
  };

  const addFiles = (list) => {
    const picked = Array.from(list || []);
    const tooBig = picked.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length) toast.error(`Too large (max 10 MB): ${tooBig.map((f) => f.name).join(", ")}`);
    const ok = picked.filter((f) => f.size <= MAX_FILE_BYTES);
    if (ok.length) setFiles((prev) => [...prev, ...ok]);
  };

  const startVoice = async () => {
    const ok = await voice.start();
    if (!ok && voice.error) toast.error(voice.error);
  };

  const sendVoice = async () => {
    const audio = await voice.stop();
    if (audio) onSend("", { attachments: [audio] });
  };

  if (voice.recording) {
    return (
      <div className="pt-3 border-t border-[var(--line-subtle)]">
        <VoiceRecorderBar seconds={voice.seconds} level={voice.level} onCancel={voice.cancel} onSend={sendVoice} />
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-[var(--line-subtle)]">
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--line-subtle)] pl-2 pr-1 py-1"
            >
              <Icon icon={fileKind(f.name || f.type).icon} className="text-[12px] text-[var(--ink-tertiary)]" />
              <span className="text-[11px] text-[var(--ink-primary)] max-w-[10rem] truncate">{f.name}</span>
              <span className="text-[10px] text-[var(--ink-tertiary)]">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${f.name}`}
                className="text-[var(--ink-tertiary)] hover:text-danger-500"
              >
                <Icon icon="solar:close-circle-linear" className="text-[13px]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none max-h-32 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />

        <input ref={fileRef} type="file" hidden multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <IconButton icon="solar:paperclip-linear" size="md" label="Attach files" onClick={() => fileRef.current?.click()} type="button" />

        {value.trim() || files.length > 0 ? (
          <IconButton icon="solar:plain-2-bold" variant="primary" size="md" label="Send" onClick={submit} disabled={posting} type="button" />
        ) : (
          <IconButton icon="solar:microphone-bold" variant="primary" size="md" label="Record voice comment" onClick={startVoice} type="button" />
        )}
      </form>
    </div>
  );
};

/**
 * One of a task's two comment threads.
 *
 * `scope="internal"` is the staff-only thread (allowed_customer = 0) and
 * `scope="client"` is the thread shared with the customer (allowed_customer = 1).
 * Which threads a viewer gets is decided by the caller — see TaskDetailContent.
 */
const CommentsPanel = ({ taskId, scope = "internal", canPost = true }) => {
  const { comments, loading, hasMore, loadMore, post, posting } = useComments(taskId, scope);

  const send = async (message, opts) => {
    try {
      await post(message, opts);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't post that comment.");
    }
  };

  return (
    <div>
      {hasMore && (
        <button
          onClick={loadMore}
          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline mb-1"
        >
          Load earlier comments
        </button>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-[var(--ink-tertiary)] py-3">
          {scope === "client"
            ? "Nothing shared with the customer yet — anything posted here is visible to them."
            : "No internal notes yet — these stay private to the team."}
        </p>
      ) : (
        <div className="divide-y divide-[var(--line-subtle)]">
          {comments.map((c) => <CommentItem key={c.id} comment={c} />)}
        </div>
      )}

      {canPost && (
        <CommentComposer
          onSend={send}
          posting={posting}
          placeholder={
            scope === "client"
              ? "Message the customer… (Enter to send)"
              : "Internal note — the customer won't see this… (Enter to send)"
          }
        />
      )}
    </div>
  );
};

export default CommentsPanel;
