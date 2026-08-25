/**
 * Instrument Panel design system: a disciplined, editorial reading console.
 * Signal Teal denotes system activity; the ORP character alone receives focus color.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  CircleHelp,
  Gauge,
  Menu,
  Pause,
  Play,
  Redo2,
  Rewind,
  SkipBack,
  SkipForward,
  SunMoon,
  UserRound,
  Volume2,
  Zap,
} from "lucide-react";
import StepprLogo from "@/components/StepprLogo";
import WpmDial from "@/components/WpmDial";

const wordSequence = ["re·markable", "attention", "momentum", "deliberate", "possibility"];
const PREFERENCES_KEY = "steppr.reader.preferences.v1";
const MIN_WPM = 100;
const MAX_WPM = 2500;
const paragraphs = [
  "Every action you take is a vote for the type of person you wish to become. If you want to be healthy, you need to make healthy choices. If you want to be wealthy, you need to make wealthy choices.",
  "You do not rise to the level of your goals. You fall to the level of your systems.",
  "Here is the most practical way I know to get 1 percent better every day. It’s called the Habits Scorecard. Print it out, fill it in, and begin to track your habits.",
];

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
};

const clampWpm = (value: number) => Math.min(MAX_WPM, Math.max(MIN_WPM, Math.round(value / 25) * 25));

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(900);
  const [mode, setMode] = useState<"fast" | "breathing">("fast");
  const [commaPause, setCommaPause] = useState(1.5);
  const [fontScale, setFontScale] = useState(1);
  const [elapsed, setElapsed] = useState(222);
  const [wordIndex, setWordIndex] = useState(0);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const totalDuration = 718;

  const changeWord = (direction: 1 | -1) => {
    setWordIndex((previous) => (previous + direction + wordSequence.length) % wordSequence.length);
  };

  const updateWpm = (value: number) => setWpm(clampWpm(value));

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<{ theme: "dark" | "light"; wpm: number; fontScale: number }>;
        if (parsed.theme === "dark" || parsed.theme === "light") setTheme(parsed.theme);
        if (typeof parsed.wpm === "number") setWpm(clampWpm(parsed.wpm));
        if (typeof parsed.fontScale === "number") setFontScale(Math.min(1.25, Math.max(0.85, parsed.fontScale)));
      }
    } catch {
      window.localStorage.removeItem(PREFERENCES_KEY);
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ theme, wpm, fontScale }));
  }, [fontScale, preferencesReady, theme, wpm]);

  useEffect(() => {
    if (!isPlaying) return;
    const wordDuration = Math.max(24, 60000 / wpm);
    const timer = window.setTimeout(() => {
      changeWord(1);
      setElapsed((previous) => (previous + wordDuration / 1000 >= totalDuration ? 0 : previous + wordDuration / 1000));
    }, wordDuration);
    return () => window.clearTimeout(timer);
  }, [isPlaying, wpm, wordIndex]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (isEditing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((playing) => !playing);
      }
      if (event.key === "ArrowUp" || event.key === "+" || event.key === "=") {
        event.preventDefault();
        setWpm((current) => clampWpm(current + 25));
      }
      if (event.key === "ArrowDown" || event.key === "-") {
        event.preventDefault();
        setWpm((current) => clampWpm(current - 25));
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "n") {
        event.preventDefault();
        changeWord(1);
      }
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "p") {
        event.preventDefault();
        changeWord(-1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const word = wordSequence[wordIndex];
  const focusIndex = useMemo(() => Math.max(1, Math.min(word.length - 2, Math.round(word.length * 0.42))), [word]);
  const progress = Math.min(100, (elapsed / totalDuration) * 100);
  const backgroundImage = theme === "dark"
    ? "url('/manus-storage/steppr-dark-signal-field_34499432.png')"
    : "url('/manus-storage/steppr-light-paper-field_ff0d1874.png')";

  const resetReader = () => {
    setIsPlaying(false);
    setElapsed(0);
    setWordIndex(0);
  };

  return (
    <main className={`steppr-app ${theme === "dark" ? "dark-theme" : "light-theme"}`} style={{ "--steppr-field": backgroundImage } as React.CSSProperties}>
      <aside className={`reader-sidebar ${isSidebarOpen ? "is-open" : ""}`} aria-label="Reader navigation">
        <div className="sidebar-topline">
          <span className="tiny-status"><span /> SESSION</span>
          <button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><ChevronLeft size={18} /></button>
        </div>
        <nav>
          <button className="sidebar-link active"><Gauge size={17} /> Reader</button>
          <button className="sidebar-link"><Volume2 size={17} /> Listening</button>
          <button className="sidebar-link"><CircleHelp size={17} /> Shortcuts</button>
        </nav>
        <div className="sidebar-footer">STEPPR OS · 01.6</div>
      </aside>

      <section className="reader-shell">
        <header className="reader-header">
          <div className="header-left">
            <button className="icon-button menu-button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle sidebar"><Menu size={22} /></button>
            <StepprLogo theme={theme} />
          </div>
          <div className="document-title"><span className="document-label">Reading</span><strong>Atomic Habits</strong><span>— Chapter 1</span></div>
          <div className="header-actions">
            <button className="icon-button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label="Switch theme"><SunMoon size={19} /></button>
            <button className="profile-button" aria-label="User profile"><UserRound size={19} /></button>
          </div>
        </header>

        <div className="main-console">
          <section className="reading-stack" aria-label="Dual optical recognition point reader">
            <div className="signal-rule"><span /> LIVE READER <i /></div>
            <article className="orp-card focus-card">
              <div className="card-label"><span>ORP 1</span><i /> Focus word</div>
              <div className="orbital-field" aria-hidden="true" />
              <div className="focus-word" style={{ fontSize: `clamp(3.8rem, 7.5vw, ${7.7 * fontScale}rem)` }}>
                {word.slice(0, focusIndex)}<em>{word[focusIndex]}</em>{word.slice(focusIndex + 1)}
              </div>
              <div className={`anchor-dot ${isPlaying ? "is-playing" : ""}`} aria-hidden="true" />
              <div className="card-corner">01 / 02</div>
            </article>

            <article className="orp-card context-card">
              <div className="context-header">
                <div className="card-label"><span>ORP 2</span><i /> Context</div>
                <span className="context-meta">LIVE POSITION</span>
              </div>
              <div className="context-copy" style={{ fontSize: `${fontScale}rem` }}>
                <p>{paragraphs[0]}</p>
                <p className="active-sentence">{paragraphs[1]}</p>
                <p>{paragraphs[2]}</p>
              </div>
              <div className="scroll-rail" aria-hidden="true"><span /></div>
            </article>
          </section>

          <section className="control-deck" aria-label="Playback control deck">
            <WpmDial wpm={wpm} onChange={updateWpm} />

            <section className="control-bay playback-bay" aria-label="Playback controls">
              <div className="bay-label">Playback</div>
              <div className="transport-row">
                <button className="transport-button" onClick={() => setElapsed((seconds) => Math.max(0, seconds - 10))}><Rewind size={22} /><span>Back 10s</span></button>
                <button className="transport-button" onClick={() => changeWord(-1)}><SkipBack size={22} /><span>Previous<br />sentence</span></button>
                <button className={`play-button ${isPlaying ? "is-playing" : ""}`} onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? "Pause reader" : "Play reader"}>{isPlaying ? <Pause size={27} fill="currentColor" /> : <Play size={27} fill="currentColor" />}</button>
                <button className="transport-button" onClick={() => changeWord(1)}><SkipForward size={22} /><span>Next<br />sentence</span></button>
                <button className="transport-button" onClick={resetReader}><Redo2 size={22} /><span>Reset</span></button>
              </div>
              <div className="progress-wrap">
                <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                <div className="progress-labels"><span><b>{formatTime(elapsed)}</b> elapsed</span><span><b>{formatTime(totalDuration - elapsed)}</b> remaining</span></div>
              </div>
              <p className="shortcut-hint"><kbd>SPACE</kbd> {isPlaying ? "pause" : "play"} <span>·</span> <kbd>↑</kbd><kbd>↓</kbd> speed <span>·</span> <kbd>←</kbd><kbd>→</kbd> sentence</p>
            </section>

            <section className="control-bay options-bay" aria-label="Reader options">
              <div className="bay-label">Mode & options</div>
              <div className="mode-switch" role="group" aria-label="Reading mode">
                <button className={mode === "fast" ? "active" : ""} onClick={() => setMode("fast")}><Zap size={15} /> Fast mode</button>
                <button className={mode === "breathing" ? "active" : ""} onClick={() => setMode("breathing")}><span className="wave">⌁</span> Sentence breathing</button>
              </div>
              <label className="setting-line">
                <span>Comma pause <b>{commaPause.toFixed(1)}×</b></span>
                <input type="range" min="0.5" max="3" step="0.1" value={commaPause} onChange={(event) => setCommaPause(Number(event.target.value))} aria-label="Comma pause multiplier" />
              </label>
              <div className="font-setting">
                <span>Font scale</span>
                <div className="scale-control">
                  <button onClick={() => setFontScale((scale) => Math.max(0.85, Number((scale - 0.05).toFixed(2))))} aria-label="Decrease font scale">−</button>
                  <span>Aa</span>
                  <button onClick={() => setFontScale((scale) => Math.min(1.25, Number((scale + 0.05).toFixed(2))))} aria-label="Increase font scale">+</button>
                </div>
              </div>
            </section>
          </section>
        </div>

        <footer className="reader-footer"><span>STEPPR ENGINE <i /> ADAPTIVE ORP</span><span>WPM {wpm} <i /> {mode === "fast" ? "FAST MODE" : "SENTENCE BREATHING"}</span></footer>
      </section>
    </main>
  );
}
