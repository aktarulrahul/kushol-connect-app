// Voice-note capture (05 · owner 2026-10-17): mono AAC in an .m4a container on both Android and
// iOS — the api's sniff accepts it (ftyp → audio/mp4) and 64 kbps keeps a 5-minute note under
// the 5 MB cap. Mounted only while the recorder sheet is open, so the native recorder (and the
// microphone) exist exactly for the recording.
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from "expo-audio";

export const VOICE_NOTE_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64_000,
};

export type VoiceNote = { uri: string; durationMs: number };

export type VoiceSessionHandle = {
  /** Stops and returns the recorded file (null when nothing was captured). */
  finish: () => Promise<VoiceNote | null>;
  /** Stops and discards. */
  cancel: () => Promise<void>;
};

export function VoiceRecordingSession({
  ref,
  onDenied,
  onFailed,
}: {
  ref?: Ref<VoiceSessionHandle>;
  onDenied: () => void;
  onFailed: () => void;
}) {
  const recorder = useAudioRecorder(VOICE_NOTE_OPTIONS);
  const started = useRef(false);
  const stopped = useRef(false);

  useEffect(() => {
    // An object (not a narrowed `let`) so the async steps see the cleanup's write.
    const session = { alive: true };
    const alive = () => session.alive;
    void (async () => {
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!alive()) return;
        if (!permission.granted) {
          onDenied();
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        if (!alive()) return;
        recorder.record();
        started.current = true;
      } catch {
        if (alive()) onFailed();
      }
    })();
    return () => {
      session.alive = false;
      if (started.current && !stopped.current) {
        stopped.current = true;
        void recorder.stop().catch(() => undefined);
      }
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
    // The session records once per mount; callbacks are read at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      finish: async () => {
        if (!started.current || stopped.current) return null;
        const durationMs = recorder.getStatus().durationMillis;
        stopped.current = true;
        await recorder.stop();
        const uri = recorder.uri;
        return uri ? { uri, durationMs } : null;
      },
      cancel: async () => {
        if (!started.current || stopped.current) return;
        stopped.current = true;
        await recorder.stop().catch(() => undefined);
      },
    }),
    [recorder],
  );

  return null;
}
