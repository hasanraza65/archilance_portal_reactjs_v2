import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { cn } from "@/lib/cn";

const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

/** Compact voice-note player used inside chat bubbles and task comments. */
const AudioPlayer = ({ src, tone = "light" }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrent(a.currentTime);
      setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    };
    const onLoaded = () => setDuration(a.duration);
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrent(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  const isDark = tone === "dark"; // rendered on a primary-colored bubble
  return (
    <div className={cn("flex items-center gap-2.5 min-w-[190px] py-0.5")}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-none transition-colors",
          isDark ? "bg-white/20 text-white hover:bg-white/30" : "bg-primary-500 text-white hover:bg-primary-600"
        )}
      >
        <Icon icon={playing ? "solar:pause-bold" : "solar:play-circle-bold"} className="text-[15px]" />
      </button>
      <div className="flex-1 min-w-0">
        <div
          onClick={seek}
          className={cn("h-1.5 rounded-full cursor-pointer overflow-hidden", isDark ? "bg-white/25" : "bg-[var(--line-subtle)]")}
        >
          <div className={cn("h-full rounded-full", isDark ? "bg-white" : "bg-primary-500")} style={{ width: `${progress}%` }} />
        </div>
        <span className={cn("block text-[10px] mt-1 tabular-nums", isDark ? "text-white/70" : "text-[var(--ink-tertiary)]")}>
          {fmt(playing || current ? current : duration)}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
