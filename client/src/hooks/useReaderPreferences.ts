/**
 * Instrument Panel design system: persistent browser-only reader preferences.
 * This hook keeps UI choices local to the reader device and synchronized by route reload.
 */
import { useEffect, useState } from "react";

export type StepprTheme = "dark" | "light" | "oled" | "sepia" | "amber" | "terminal" | "solarized" | "paper" | "matrix";
export type ReaderTypeface = "system" | "atkinson" | "dyslexic" | "mono";

export type ReaderPreferences = {
  theme: StepprTheme;
  wpm: number;
  fontScale: number;
  reducedMotion: boolean;
  highContrast: boolean;
  tripleMirror: boolean;
  letterSpacing: number;
  lineSpacing: number;
  paragraphGap: number;
  typeface: ReaderTypeface;
  ttsVoice: string;
  ttsEnabled: boolean;
  ttsLockToWpm: boolean;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
};

export const READER_PREFERENCES_KEY = "steppr.reader.preferences.v2";

export const defaultReaderPreferences: ReaderPreferences = {
  theme: "dark",
  wpm: 900,
  fontScale: 1,
  reducedMotion: false,
  highContrast: false,
  tripleMirror: false,
  letterSpacing: 0,
  lineSpacing: 1.58,
  paragraphGap: 0.9,
  typeface: "system",
  ttsVoice: "",
  ttsEnabled: false,
  ttsLockToWpm: true,
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
};

const normalize = (candidate: Partial<ReaderPreferences>): ReaderPreferences => ({
  ...defaultReaderPreferences,
  ...candidate,
  wpm: Math.min(3700, Math.max(100, Math.round((candidate.wpm ?? defaultReaderPreferences.wpm) / 25) * 25)),
  fontScale: Math.min(1.4, Math.max(0.85, candidate.fontScale ?? defaultReaderPreferences.fontScale)),
  letterSpacing: Math.min(0.16, Math.max(0, candidate.letterSpacing ?? defaultReaderPreferences.letterSpacing)),
  lineSpacing: Math.min(2.1, Math.max(1.25, candidate.lineSpacing ?? defaultReaderPreferences.lineSpacing)),
  paragraphGap: Math.min(2.5, Math.max(0.4, candidate.paragraphGap ?? defaultReaderPreferences.paragraphGap)),
  ttsRate: Math.min(2, Math.max(0.5, candidate.ttsRate ?? defaultReaderPreferences.ttsRate)),
  ttsPitch: Math.min(2, Math.max(0.5, candidate.ttsPitch ?? defaultReaderPreferences.ttsPitch)),
  ttsVolume: Math.min(1, Math.max(0, candidate.ttsVolume ?? defaultReaderPreferences.ttsVolume)),
});

export function useReaderPreferences() {
  const [preferences, setPreferences] = useState<ReaderPreferences>(() => {
    try {
      const legacy = window.localStorage.getItem("steppr.reader.preferences.v1");
      const stored = window.localStorage.getItem(READER_PREFERENCES_KEY) ?? legacy;
      return stored ? normalize(JSON.parse(stored)) : defaultReaderPreferences;
    } catch {
      return defaultReaderPreferences;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(READER_PREFERENCES_KEY, JSON.stringify(preferences));
    window.localStorage.setItem("steppr.reader.preferences.v1", JSON.stringify({ theme: preferences.theme === "light" ? "light" : "dark", wpm: preferences.wpm, fontScale: preferences.fontScale }));
  }, [preferences]);

  const updatePreferences = (update: Partial<ReaderPreferences> | ((current: ReaderPreferences) => Partial<ReaderPreferences>)) => {
    setPreferences((current) => normalize({ ...current, ...(typeof update === "function" ? update(current) : update) }));
  };

  return { preferences, updatePreferences };
}
