// Stage-2 voice playback (COM-AP-007): no expo-av in the current native binary, so fixtures drive
// a timed progress clock matching `durationMs`. Swap the engine for real AAC when Stage 5 adds
// expo-audio — the hook shape (play/pause/progress) stays.
import { useEffect, useRef, useState } from "react";

export type VoicePlayback = {
  playing: boolean;
  /** 0..1 */
  progress: number;
  toggle: () => void;
  stop: () => void;
};

export function useVoicePlayback(durationMs: number, messageId: string): VoicePlayback {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef<number | null>(null);
  const baseProgress = useRef(0);
  const raf = useRef<ReturnType<typeof setInterval> | null>(null);
  const duration = Math.max(durationMs, 1_000);

  useEffect(() => {
    return () => {
      if (raf.current) clearInterval(raf.current);
    };
  }, [messageId]);

  const stop = () => {
    if (raf.current) clearInterval(raf.current);
    raf.current = null;
    startedAt.current = null;
    baseProgress.current = 0;
    setPlaying(false);
    setProgress(0);
  };

  const tick = () => {
    if (startedAt.current == null) return;
    const elapsed = Date.now() - startedAt.current;
    const next = Math.min(1, baseProgress.current + elapsed / duration);
    setProgress(next);
    if (next >= 1) {
      stop();
    }
  };

  const toggle = () => {
    if (playing) {
      if (raf.current) clearInterval(raf.current);
      raf.current = null;
      if (startedAt.current != null) {
        const elapsed = Date.now() - startedAt.current;
        baseProgress.current = Math.min(1, baseProgress.current + elapsed / duration);
      }
      startedAt.current = null;
      setPlaying(false);
      return;
    }
    startedAt.current = Date.now();
    setPlaying(true);
    raf.current = setInterval(tick, 50);
  };

  return { playing, progress, toggle, stop };
}
