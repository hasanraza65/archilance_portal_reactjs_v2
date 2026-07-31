import React, { useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

const SlideToAccept = ({ onAccept, disabled = false, label = "Slide to Accept" }) => {
  const trackRef = useRef(null);
  const maxRef = useRef(0);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  const HANDLE = 54;
  const PAD = 4;

  const getMax = () => {
    const w = trackRef.current?.offsetWidth || 0;
    return Math.max(0, w - HANDLE - PAD * 2);
  };

  const onPointerDown = (e) => {
    if (disabled || done) return;
    maxRef.current = getMax();
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const rect = trackRef.current.getBoundingClientRect();
    let nx = e.clientX - rect.left - HANDLE / 2;
    nx = Math.max(0, Math.min(nx, maxRef.current));
    setX(nx);
  };

  const finish = () => {
    if (!dragging) return;
    setDragging(false);
    if (x >= maxRef.current * 0.9 && maxRef.current > 0) {
      setX(maxRef.current);
      setDone(true);
      onAccept?.();
    } else {
      setX(0);
    }
  };

  const pct = maxRef.current ? x / maxRef.current : 0;

  return (
    <div ref={trackRef} className={`relative w-full h-[62px] rounded-full overflow-hidden select-none ${disabled ? "opacity-60" : ""}`} style={{ background: "#e8ecf3" }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${Math.max(HANDLE + PAD * 2, x + HANDLE + PAD)}px`,
          background: done ? "linear-gradient(90deg,#059669,#10b981)" : "linear-gradient(90deg,#6d5ef8,#8b7bff)",
          transition: dragging ? "none" : "width .25s ease",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-semibold tracking-wide" style={{ color: pct > 0.35 || done ? "#ffffff" : "#64748b", transition: "color .2s" }}>
        {done ? "Accepted" : label}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        role="slider"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled && !done) { setDone(true); onAccept?.(); } }}
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white shadow-md ${disabled || done ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        style={{ width: HANDLE, height: HANDLE, left: PAD + x, transition: dragging ? "none" : "left .25s ease", touchAction: "none" }}
      >
        <Icon icon={done ? "solar:check-circle-bold" : "solar:double-alt-arrow-right-bold"} className={`text-xl ${done ? "text-emerald-500" : "text-primary-500"}`} />
      </div>
    </div>
  );
};

export default SlideToAccept;
