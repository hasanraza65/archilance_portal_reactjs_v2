import React, { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import EmptyState from "@/components/ui/EmptyState";
import { fetchDeletedScreenshots } from "@/api/workSessions";
import { getMediaUrl } from "@/api/media";
import { formatDateTime } from "@/lib/format";

/**
 * Screenshots an employee soft-deleted from this session — admin-only.
 *
 * Fetched fresh every time the modal opens rather than cached client-side,
 * so a delete that just happened shows up immediately (see
 * docs/deleted-screenshots-flow.md).
 */
const DeletedScreenshotsModal = ({ open, sessionId, onClose }) => {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    if (!open || !sessionId) return;
    let cancelled = false;
    setScreenshots([]);
    setActiveIndex(null);
    setLoading(true);
    fetchDeletedScreenshots(sessionId)
      .then((data) => { if (!cancelled) setScreenshots(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setScreenshots([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, sessionId]);

  return (
    <Modal open={open} onClose={onClose} title="Deleted screenshots" className="max-w-2xl">
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 py-1">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton aspect-video rounded-lg" />)}
        </div>
      ) : screenshots.length === 0 ? (
        <EmptyState
          icon="solar:trash-bin-trash-linear"
          title="Nothing deleted"
          description="This session has no deleted screenshots."
        />
      ) : activeIndex !== null ? (
        <div className="space-y-3">
          <button
            onClick={() => setActiveIndex(null)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            <Icon icon="solar:alt-arrow-left-linear" /> Back to grid
          </button>
          <img
            src={getMediaUrl(screenshots[activeIndex].screenshot_file, screenshots[activeIndex].created_at)}
            alt=""
            className="w-full rounded-xl border border-[var(--line-subtle)]"
          />
          <p className="text-xs text-[var(--ink-tertiary)] flex items-center gap-1.5">
            <Icon icon="solar:calendar-linear" />
            {formatDateTime(screenshots[activeIndex].created_at)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 py-1">
          {screenshots.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveIndex(i)}
              className="aspect-video rounded-lg overflow-hidden border border-[var(--line-subtle)] hover:ring-2 hover:ring-primary-400 transition-shadow"
            >
              <img src={getMediaUrl(s.screenshot_file, s.created_at)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default DeletedScreenshotsModal;
