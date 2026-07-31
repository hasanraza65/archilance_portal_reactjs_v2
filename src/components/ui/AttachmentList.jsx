import React from "react";
import Icon from "./Icon";
import AudioPlayer from "./AudioPlayer";
import { fileKind, formatBytes } from "./FilePicker";
import { getAttachmentUrl } from "@/api/media";
import { cn } from "@/lib/cn";

const isAudio = (a) =>
  /^audio\//i.test(a?.file_type || "") || /\.(webm|m4a|mp3|ogg|wav)$/i.test(a?.file_name || a?.file_path || "");

const isImage = (a) =>
  /^image\//i.test(a?.file_type || "") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(a?.file_name || a?.file_path || "");

/**
 * Renders already-uploaded attachments (task, brief or comment).
 *
 * Images get a thumbnail, voice notes get the inline player, everything else
 * gets a typed row that opens in a new tab. `onRemove(id)` adds a delete button.
 */
const AttachmentList = ({ attachments = [], onRemove, removingId, emptyText, compact = false, className }) => {
  if (!attachments.length) {
    return emptyText ? <p className="text-xs text-[var(--ink-tertiary)]">{emptyText}</p> : null;
  }

  return (
    <ul className={cn("space-y-1.5", className)}>
      {attachments.map((a) => {
        const url = getAttachmentUrl(a.file_path, a.created_at);
        const name = a.file_name || "Attachment";

        if (isAudio(a)) {
          return (
            <li key={a.id} className="flex items-center gap-2">
              <AudioPlayer src={url} />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  disabled={removingId === a.id}
                  aria-label={`Remove ${name}`}
                  className="text-[var(--ink-tertiary)] hover:text-danger-500 disabled:opacity-40 flex-none"
                >
                  <Icon icon="solar:trash-bin-trash-linear" className="text-[14px]" />
                </button>
              )}
            </li>
          );
        }

        const kind = fileKind(a.file_name || a.file_type);
        return (
          <li
            key={a.id}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-sunken)]",
              compact ? "px-2.5 py-1.5" : "px-3 py-2"
            )}
          >
            {isImage(a) ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex-none">
                <img
                  src={url}
                  alt={name}
                  loading="lazy"
                  className="w-9 h-9 rounded-md object-cover border border-[var(--line-subtle)]"
                />
              </a>
            ) : (
              <Icon icon={kind.icon} className={cn("text-[16px] flex-none", kind.tint)} />
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 text-xs text-[var(--ink-primary)] hover:text-primary-600 dark:hover:text-primary-400 truncate"
              title={name}
            >
              {name}
            </a>

            {a.file_size ? (
              <span className="text-[10px] text-[var(--ink-tertiary)] flex-none">{formatBytes(a.file_size)}</span>
            ) : null}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${name}`}
              className="text-[var(--ink-tertiary)] hover:text-primary-500 flex-none opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Icon icon="solar:arrow-right-up-linear" className="text-[14px]" />
            </a>

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(a.id)}
                disabled={removingId === a.id}
                aria-label={`Remove ${name}`}
                className="text-[var(--ink-tertiary)] hover:text-danger-500 disabled:opacity-40 flex-none"
              >
                <Icon
                  icon={removingId === a.id ? "solar:refresh-linear" : "solar:trash-bin-trash-linear"}
                  className={cn("text-[14px]", removingId === a.id && "animate-spin")}
                />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default AttachmentList;
