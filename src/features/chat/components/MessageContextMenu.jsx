import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icon";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { QUICK_REACTIONS } from "../constants";

/**
 * Right-click (desktop) / long-press (mobile) message menu — mirrors v1's
 * `MessageContextMenu.jsx`: a floating panel anchored at the cursor/touch
 * point with a quick-reaction strip up top and Reply/Forward/Copy/Edit/Delete
 * below it. "Forward" is new (v1 never had it); everything else matches.
 */
const MessageContextMenu = ({
  x,
  y,
  message,
  isOwn,
  currentUserId,
  onClose,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReact,
  onUnreact,
}) => {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: y, left: x, ready: false });

  // Clamp to the viewport once we know the panel's real size.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
    if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
    setPos({ top: Math.max(8, top), left: Math.max(8, left), ready: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  if (!message) return null;

  const myReaction = (message.reactions || []).find((r) => r.user_id === currentUserId);

  const copy = () => {
    navigator.clipboard?.writeText(message.message || "");
    toast.success("Copied to clipboard");
    onClose();
  };

  const items = [
    { label: "Reply", icon: "solar:reply-linear", onClick: onReply },
    { label: "Forward", icon: "solar:forward-linear", onClick: onForward },
    Boolean(message.message) && { label: "Copy", icon: "solar:copy-linear", onClick: copy },
    isOwn && Boolean(message.message) && { label: "Edit", icon: "solar:pen-linear", onClick: onEdit },
    isOwn && { label: "Delete", icon: "solar:trash-bin-trash-linear", danger: true, onClick: onDelete },
  ].filter(Boolean);

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: pos.top, left: pos.left, opacity: pos.ready ? 1 : 0 }}
      className="z-[9999] w-52 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel p-1.5 transition-opacity duration-100"
    >
      <div className="flex items-center justify-around gap-0.5 p-1 mb-1 border-b border-[var(--line-subtle)]">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              myReaction?.reaction === emoji ? onUnreact() : onReact(emoji);
            }}
            className={cn(
              "text-base p-1 rounded-full hover:scale-125 transition-transform",
              myReaction?.reaction === emoji && "bg-primary-50 dark:bg-primary-500/15"
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors hover:bg-[var(--surface-sunken)]",
                item.danger ? "text-danger-500" : "text-[var(--ink-primary)]"
              )}
            >
              <Icon icon={item.icon} className="text-[15px] flex-none" />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
};

export default MessageContextMenu;
