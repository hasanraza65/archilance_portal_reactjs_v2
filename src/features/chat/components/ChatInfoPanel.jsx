import React, { useMemo } from "react";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import { getMediaUrl, getAttachmentUrl } from "@/api/media";
import { cn } from "@/lib/cn";

const isImageAttachment = (a) =>
  /^image\//i.test(a?.file_type || a?.mime_type || "") ||
  /\.(jpe?g|png|gif|webp|svg)$/i.test(a?.file_name || a?.file_path || "");

const isVoiceAttachment = (a) =>
  /^audio\//i.test(a?.file_type || a?.mime_type || "") ||
  /\.(webm|m4a|mp3|ogg|wav)$/i.test(a?.file_name || a?.file_path || "");

/**
 * Contact info side panel — mirrors v1's `Info.jsx` scope (profile + shared
 * media), but on real data instead of hardcoded "Pakistan / English" filler:
 * shared photos and files are pulled from attachments already loaded for this
 * conversation (there's no dedicated "shared media" endpoint in v1 either —
 * its version of this section was commented out).
 */
const ChatInfoPanel = ({ contact, messages = [], onClose, embedded = false }) => {
  const { images, files } = useMemo(() => {
    const imgs = [];
    const rest = [];
    messages.forEach((m) => {
      (m.attachments || []).forEach((a) => {
        if (isVoiceAttachment(a)) return;
        (isImageAttachment(a) ? imgs : rest).push(a);
      });
    });
    return { images: imgs.reverse(), files: rest.reverse() };
  }, [messages]);

  if (!contact) return null;

  const body = (
    <>
      <div className="flex flex-col items-center text-center pb-5 border-b border-[var(--line-subtle)]">
        <Avatar name={contact.name} src={contact.profile_pic ? getMediaUrl(contact.profile_pic) : null} size="xl" />
        <p className="mt-3 font-semibold text-[var(--ink-primary)]">{contact.name}</p>
        {contact.email && <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">{contact.email}</p>}
      </div>

      <div className="py-4">
        <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide mb-2.5">
          Shared media{images.length > 0 && ` (${images.length})`}
        </p>
        {images.length === 0 ? (
          <p className="text-xs text-[var(--ink-tertiary)]">No shared photos yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {images.slice(0, 9).map((a) => (
              <a
                key={a.id}
                href={getAttachmentUrl(a.file_path, a.created_at)}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-lg overflow-hidden bg-[var(--surface-sunken)]"
              >
                <img
                  src={getAttachmentUrl(a.file_path, a.created_at)}
                  alt={a.file_name || "Shared image"}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="py-4 border-t border-[var(--line-subtle)]">
        <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide mb-2.5">
          Files{files.length > 0 && ` (${files.length})`}
        </p>
        {files.length === 0 ? (
          <p className="text-xs text-[var(--ink-tertiary)]">No shared files yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {files.slice(0, 12).map((a) => (
              <li key={a.id}>
                <a
                  href={getAttachmentUrl(a.file_path, a.created_at)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-sunken)] transition-colors text-xs text-[var(--ink-primary)]"
                >
                  <Icon icon="solar:paperclip-linear" className="text-[14px] text-[var(--ink-tertiary)] flex-none" />
                  <span className="truncate">{a.file_name || "Attachment"}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  if (embedded) return <div>{body}</div>;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--surface-raised)]">
      <div className={cn("flex items-center justify-between px-4 h-14 flex-none border-b border-[var(--line-subtle)]")}>
        <span className="text-sm font-semibold text-[var(--ink-primary)]">Contact info</span>
        <IconButton icon="solar:close-circle-linear" size="sm" onClick={onClose} label="Close" />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-5">{body}</div>
    </div>
  );
};

export default ChatInfoPanel;
