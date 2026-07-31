import { useCallback, useEffect, useRef, useState } from "react";

/**
 * WhatsApp-style voice note recorder built on MediaRecorder.
 * Produces a .webm File (the same format v1's backend already accepts for
 * comment/chat voice attachments), plus a live elapsed-seconds counter and a
 * coarse input level for the waveform animation.
 */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording isn't supported in this browser.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      cancelledRef.current = false;
      chunksRef.current = [];

      // Pick the first mime type this browser actually supports.
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferred.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();

      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

      // Lightweight level meter for the waveform bars.
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setLevel(Math.min(1, avg / 90));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* level meter is cosmetic — recording still works without it */
      }
      return true;
    } catch (err) {
      setError(err?.name === "NotAllowedError" ? "Microphone permission denied." : "Couldn't start recording.");
      cleanup();
      return false;
    }
  }, [cleanup]);

  /** Stops and resolves with a File, or null if cancelled / empty. */
  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          setRecording(false);
          cleanup();
          resolve(null);
          return;
        }
        recorder.onstop = () => {
          setRecording(false);
          cleanup();
          if (cancelledRef.current || chunksRef.current.length === 0) {
            resolve(null);
            return;
          }
          const type = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type });
          const ext = type.includes("mp4") ? "m4a" : "webm";
          resolve(new File([blob], `voice-${Date.now()}.${ext}`, { type }));
        };
        recorder.stop();
      }),
    [cleanup]
  );

  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    await stop();
  }, [stop]);

  return { recording, seconds, level, error, start, stop, cancel };
}

export const formatRecordingTime = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
