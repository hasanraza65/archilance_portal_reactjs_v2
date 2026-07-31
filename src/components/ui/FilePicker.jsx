import React, { useRef, useState } from "react";
import Icon from "./Icon";
import { cn } from "@/lib/cn";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // backend validates `max:10240` (KB)

export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Rough file-kind → icon/tint, from the extension or mime type. */
export function fileKind(nameOrType = "") {
  const s = String(nameOrType).toLowerCase();
  if (/(^image\/)|\.(png|jpe?g|gif|webp|bmp|svg|heic)$/.test(s)) return { icon: "solar:camera-bold", tint: "text-blue-500" };
  if (/(^audio\/)|\.(webm|m4a|mp3|ogg|wav)$/.test(s)) return { icon: "solar:microphone-bold", tint: "text-purple-500" };
  if (/pdf/.test(s)) return { icon: "solar:document-text-linear", tint: "text-red-500" };
  if (/(sheet|excel)|\.(xlsx?|csv)$/.test(s)) return { icon: "solar:chart-square-bold-duotone", tint: "text-emerald-500" };
  if (/(word|document)|\.(docx?|rtf)$/.test(s)) return { icon: "solar:document-linear", tint: "text-blue-600" };
  if (/(zip|rar|7z|compressed)/.test(s)) return { icon: "solar:archive-linear", tint: "text-amber-500" };
  if (/\.(dwg|rvt|skp|3dm|max)$/.test(s)) return { icon: "solar:widget-4-linear", tint: "text-indigo-500" };
  return { icon: "solar:paperclip-linear", tint: "text-[var(--ink-tertiary)]" };
}

/**
 * Drag-and-drop + click file picker for pending (not-yet-uploaded) files.
 *
 * Oversized files are rejected here rather than at the server, because the
 * backend's `max:10240` failure comes back as a generic 422 that says nothing
 * useful about which file was too big.
 */
const FilePicker = ({ files = [], onChange, accept, multiple = true, disabled = false, hint, className }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState([]);

  const add = (incoming) => {
    const list = Array.from(incoming || []);
    if (list.length === 0) return;
    const tooBig = list.filter((f) => f.size > MAX_FILE_BYTES).map((f) => f.name);
    const ok = list.filter((f) => f.size <= MAX_FILE_BYTES);
    setRejected(tooBig);
    if (ok.length) onChange(multiple ? [...files, ...ok] : ok.slice(0, 1));
  };

  const removeAt = (i) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inputRef.current?.click(); }
        }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) add(e.dataTransfer.files); }}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors",
          disabled
            ? "border-[var(--line-subtle)] opacity-60 cursor-not-allowed"
            : dragging
            ? "border-primary-400 bg-primary-500/5 cursor-pointer"
            : "border-[var(--line-subtle)] hover:border-primary-300 hover:bg-[var(--surface-sunken)] cursor-pointer"
        )}
      >
        <Icon icon="solar:inbox-in-linear" className="text-[20px] text-primary-500" />
        <p className="text-xs font-medium text-[var(--ink-primary)]">
          Drop files here or <span className="text-primary-600 dark:text-primary-400">browse</span>
        </p>
        <p className="text-[10px] text-[var(--ink-tertiary)]">{hint || "Up to 10 MB per file"}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={accept}
        onChange={(e) => { add(e.target.files); e.target.value = ""; }}
      />

      {rejected.length > 0 && (
        <p className="text-[11px] text-danger-500 mt-2 flex items-start gap-1.5">
          <Icon icon="solar:danger-triangle-bold" className="text-[12px] mt-0.5 flex-none" />
          Too large (max 10 MB): {rejected.join(", ")}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {files.map((f, i) => {
            const kind = fileKind(f.name || f.type);
            return (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-sunken)] px-3 py-2"
              >
                <Icon icon={kind.icon} className={cn("text-[15px] flex-none", kind.tint)} />
                <span className="text-xs text-[var(--ink-primary)] truncate flex-1">{f.name}</span>
                <span className="text-[10px] text-[var(--ink-tertiary)] flex-none">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`Remove ${f.name}`}
                  className="text-[var(--ink-tertiary)] hover:text-danger-500 flex-none"
                >
                  <Icon icon="solar:close-circle-linear" className="text-[15px]" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FilePicker;
