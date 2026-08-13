import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import { getMediaUrl } from "@/api/media";
import { formatDateTime, formatTime } from "@/lib/format";

const ScreenshotGallery = ({ screenshots = [], isAdminView = false, onDelete }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  if (screenshots.length === 0) return null;

  const fieldFor = (s) => (isAdminView ? s.screenshot_file : s.emp_screenshot_file || s.screenshot_file);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {screenshots.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveIndex(i)}
            className="relative flex-none w-20 h-14 rounded-lg overflow-hidden border border-[var(--line-subtle)] hover:ring-2 hover:ring-primary-400 transition-shadow"
          >
            <img src={getMediaUrl(fieldFor(s), s.created_at)} alt="" className="w-full h-full object-cover" loading="lazy" />
            {s.created_at && (
              <span className="absolute bottom-0 inset-x-0 py-0.5 text-center text-[9px] leading-none font-medium text-white bg-black/55">
                {formatTime(s.created_at)}
              </span>
            )}
          </button>
        ))}
      </div>

      {createPortal(
        <AnimatePresence>
          {activeIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-6"
              onClick={() => setActiveIndex(null)}
            >
              <motion.img
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                src={getMediaUrl(fieldFor(screenshots[activeIndex]), screenshots[activeIndex].created_at)}
                alt=""
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-[85vh] rounded-xl shadow-float"
              />
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {onDelete && (
                  <IconButton
                    icon="solar:trash-bin-trash-bold"
                    variant="danger"
                    className="bg-white/10 text-white"
                    onClick={(e) => { e.stopPropagation(); onDelete(screenshots[activeIndex].id); setActiveIndex(null); }}
                    label="Delete"
                  />
                )}
                <IconButton icon="solar:close-circle-bold" className="bg-white/10 text-white" onClick={() => setActiveIndex(null)} label="Close" />
              </div>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-xs flex items-center gap-1.5">
                <Icon icon="solar:calendar-linear" />
                {formatDateTime(screenshots[activeIndex].created_at)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ScreenshotGallery;
