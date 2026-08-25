/**
 * Instrument Panel design system: the central Steppr pacing engine.
 * The screen keeps ORP focus dominant while local-first controls and telemetry remain quietly available.
 */
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, CircleHelp, CopyCheck, Gauge, Pause, Play, Redo2, Rewind, SkipBack, SkipForward, Sparkles, Volume2, X, Zap } from "lucide-react";
import { Link } from "wouter";
import AccessibilityDrawer from "@/components/AccessibilityDrawer";
import GlobalHeader from "@/components/GlobalHeader";
import WpmDial from "@/components/WpmDial";
import { useReaderPreferences } from "@/hooks/useReaderPreferences";
import { getLocalTelemetry, saveReadingSession, updateLocalTelemetry } from "@/lib/localStore";

const wordSequence = ["re·markable", "attention", "momentum", "deliberate", "possibility"];
const paragraphs = [
  "Every action you take is a vote for the type of person you wish to become. If you want to be healthy, you need to make healthy choices. If you want to be wealthy, you need to make wealthy choices.",
  "You do not rise to the level of your goals. You fall to the level of your systems.",
  "Here is the most practical way I know to get 1 percent better every day. It’s called the Habits Scorecard. Print it out, fill it in, and begin to track your habits.",
];

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
};

export default function Home() {
  const { preferences, updatePreferences } = useReaderPreferences();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isAccessibilityOpen, setAccessibilityOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<"fast" | "breathing">("fast");
  const [commaPause, setCommaPause] = useState(1.5);
  const [elapsed, setElapsed] = useState(222);
  const [wordIndex, setWordIndex] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const totalDuration = 718;

  const changeWord = (direction: 1 | -1) => {
    setWordIndex((previous) => (previous + direction + wordSequence.length) % wordSequence.length);
  };

  useEffect(() => {
    if (!isPlaying || elapsed >= totalDuration) return;
    const baseDuration = 60000 / preferences.wpm;
    const wordDuration = Math.max(24, baseDuration * (mode === "breathing" ? commaPause : 1));
    const timer = window.setTimeout(() => {
      changeWord(1);
      setElapsed((previous) => Math.min(totalDuration, previous + wordDuration / 1000));
    }, wordDuration);
    return () => window.clearTimeout(timer);
  }, [commaPause, elapsed, isPlaying, mode, preferences.wpm, wordIndex]);

  useEffect(() => {
    if (elapsed >= totalDuration) {
      setIsPlaying(false);
      setShowAchievement(true);
    }
  }, [elapsed]);

  useEffect(() => {
    window.localStorage.setItem("steppr.reader.session.v1", JSON.stringify({ tokenIndex: wordIndex, elapsed, totalDuration, updatedAt: Date.now() }));
  }, [elapsed, totalDuration, wordIndex]);

  useEffect(() => {
    if (!showAchievement) return;
    const recordLocalCompletion = async () => {
      try {
        const current = await getLocalTelemetry();
        const activeDays = Array.from(new Set([...current.activeDays, new Date().toISOString().slice(0, 10)]));
        await saveReadingSession({ id: sessionId, documentId: "sample-atomic-habits", startedAt: Date.now() - Math.round(elapsed * 1000), completedAt: Date.now(), tokenIndex: wordIndex, totalTokens: wordSequence.length, peakWpm: preferences.wpm, wordsRead: 1468 });
        await updateLocalTelemetry({ totalWords: current.totalWords + 1468, totalFocusSeconds: current.totalFocusSeconds + Math.round(elapsed), completedSessions: current.completedSessions + 1, activeDays });
      } catch {
        // IndexedDB can be unavailable in privacy-restricted browsing contexts; the reader itself remains functional.
      }
    };
    recordLocalCompletion();
  }, [elapsed, preferences.wpm, sessionId, showAchievement, wordIndex]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (isEditing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === "Space") { event.preventDefault(); setIsPlaying((playing) => !playing); }
      if (event.key === "ArrowUp" || event.key === "+" || event.key === "=") { event.preventDefault(); updatePreferences((current) => ({ wpm: current.wpm + 25 })); }
      if (event.key === "ArrowDown" || event.key === "-") { event.preventDefault(); updatePreferences((current) => ({ wpm: current.wpm - 25 })); }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "n") { event.preventDefault(); changeWord(1); }
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "p") { event.preventDefault(); changeWord(-1); }
      if (event.key.toLowerCase() === "m") { event.preventDefault(); updatePreferences((current) => ({ tripleMirror: !current.tripleMirror })); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [updatePreferences]);

  const word = wordSequence[wordIndex];
  const focusIndex = useMemo(() => Math.max(1, Math.min(word.length - 2, Math.round(word.length * 0.42))), [word]);
  const progress = Math.min(100, (elapsed / totalDuration) * 100);
  const themeClass = `theme-${preferences.theme}`;
  const backgroundImage = preferences.theme === "light" || preferences.theme === "sepia"
    ? "url('/manus-storage/steppr-light-paper-field_ff0d1874.png')"
    : "url('/manus-storage/steppr-dark-signal-field_34499432.png')";
  const resetReader = () => { setIsPlaying(false); setElapsed(0); setWordIndex(0); setShowAchievement(false); };
  const mirrorWords = [wordSequence[(wordIndex - 1 + wordSequence.length) % wordSequence.length], word, wordSequence[(wordIndex + 1) % wordSequence.length]];

  return (
    <main className={`steppr-app ${themeClass} ${preferences.highContrast ? "high-contrast" : ""} ${preferences.reducedMotion ? "motion-reduced" : ""}`} style={{ "--steppr-field": backgroundImage, "--reader-letter-spacing": `${preferences.letterSpacing}em`, "--reader-line-height": preferences.lineSpacing } as React.CSSProperties}>
      <GlobalHeader preferences={preferences} updatePreferences={updatePreferences} onOpenAccessibility={() => setAccessibilityOpen(true)} onOpenMenu={() => setSidebarOpen(true)} />
      <aside className={`reader-sidebar ${isSidebarOpen ? "is-open" : ""}`} aria-label="Reader navigation">
        <div className="sidebar-topline"><span className="tiny-status"><span /> LOCAL SESSION</span><button className="global-icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><ChevronLeft size={18} /></button></div>
        <nav>
          <Link href="/pacing-engine" className="sidebar-link active"><Gauge size={17} /> Pacing engine</Link>
          <Link href="/library" className="sidebar-link"><Volume2 size={17} /> Library</Link>
          <button className="sidebar-link" onClick={() => { setSidebarOpen(false); setAccessibilityOpen(true); }}><CircleHelp size={17} /> Accessibility</button>
        </nav>
        <div className="sidebar-footer">DEVICE-LOCAL · NO SYNC</div>
      </aside>
      <section className="reader-shell">
        <div className="main-console pacing-console">
          <section className="reading-stack" aria-label="Dual optical recognition point reader">
            <div className="signal-rule"><span /> {isPlaying ? "LIVE READER" : "READY"} <i /><b>{preferences.tripleMirror ? "MIRROR ×3" : "DUAL ORP"}</b></div>
            <article className={`orp-card focus-card ${preferences.tripleMirror ? "mirror-enabled" : ""}`}>
              <div className="card-label"><span>ORP 1</span><i /> {preferences.tripleMirror ? "Triple-mirror corridor" : "Focus word"}</div>
              <div className="orbital-field" aria-hidden="true" />
              {preferences.tripleMirror ? (
                <div className="mirror-corridor">
                  <span>{mirrorWords[0]}</span>
                  <strong>{mirrorWords[1].slice(0, focusIndex)}<em>{mirrorWords[1][focusIndex]}</em>{mirrorWords[1].slice(focusIndex + 1)}</strong>
                  <span>{mirrorWords[2]}</span>
                </div>
              ) : (
                <div className="focus-word" style={{ fontSize: `clamp(3.8rem, 7.5vw, ${7.7 * preferences.fontScale}rem)` }}>{word.slice(0, focusIndex)}<em>{word[focusIndex]}</em>{word.slice(focusIndex + 1)}</div>
              )}
              <div className={`anchor-dot ${isPlaying ? "is-playing" : ""}`} aria-hidden="true" />
              <button className={`mirror-toggle ${preferences.tripleMirror ? "active" : ""}`} onClick={() => updatePreferences((current) => ({ tripleMirror: !current.tripleMirror }))}><CopyCheck size={14} /> Mirror ×3 <kbd>M</kbd></button>
              <div className="card-corner">01 / 02</div>
            </article>
            <article className="orp-card context-card">
              <div className="context-header"><div className="card-label"><span>ORP 2</span><i /> Context</div><span className="context-meta">LOCAL POSITION</span></div>
              <div className="context-copy" style={{ fontSize: `${preferences.fontScale}rem` }}><p>{paragraphs[0]}</p><p className="active-sentence">{paragraphs[1]}</p><p>{paragraphs[2]}</p></div>
              <div className="scroll-rail" aria-hidden="true"><span style={{ height: `${Math.max(18, progress)}%` }} /></div>
            </article>
          </section>
          <section className="telemetry-strip" aria-label="Live reading telemetry"><span><b>{preferences.wpm}</b> WPM</span><span><b>{Math.round(progress)}%</b> COMPLETE</span><span><b>{formatTime(totalDuration - elapsed)}</b> REMAINING</span><div><i><span style={{ width: `${progress}%` }} /></i></div></section>
          <section className="control-deck" aria-label="Playback control deck">
            <WpmDial wpm={preferences.wpm} onChange={(wpm) => updatePreferences({ wpm })} />
            <section className="control-bay playback-bay" aria-label="Playback controls">
              <div className="bay-label">Playback</div>
              <div className="transport-row"><button className="transport-button" onClick={() => setElapsed((seconds) => Math.max(0, seconds - 10))}><Rewind size={22} /><span>Back 10s</span></button><button className="transport-button" onClick={() => changeWord(-1)}><SkipBack size={22} /><span>Previous<br />sentence</span></button><button className={`play-button ${isPlaying ? "is-playing" : ""}`} onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? "Pause reader" : "Play reader"}>{isPlaying ? <Pause size={27} fill="currentColor" /> : <Play size={27} fill="currentColor" />}</button><button className="transport-button" onClick={() => changeWord(1)}><SkipForward size={22} /><span>Next<br />sentence</span></button><button className="transport-button" onClick={resetReader}><Redo2 size={22} /><span>Reset</span></button></div>
              <div className="progress-wrap"><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-labels"><span><b>{formatTime(elapsed)}</b> elapsed</span><span><b>{formatTime(totalDuration - elapsed)}</b> remaining</span></div></div>
              <p className="shortcut-hint"><kbd>SPACE</kbd> {isPlaying ? "pause" : "play"} <span>·</span> <kbd>↑</kbd><kbd>↓</kbd> speed <span>·</span> <kbd>←</kbd><kbd>→</kbd> sentence</p>
            </section>
            <section className="control-bay options-bay" aria-label="Reader options">
              <div className="bay-label">Mode & options</div>
              <div className="mode-switch" role="group" aria-label="Reading mode"><button className={mode === "fast" ? "active" : ""} onClick={() => setMode("fast")}><Zap size={15} /> Fast mode</button><button className={mode === "breathing" ? "active" : ""} onClick={() => setMode("breathing")}><span className="wave">⌁</span> Sentence breathing</button></div>
              <label className="setting-line"><span>Breathing room <b>{Math.round(commaPause * 1000)}ms</b></span><input type="range" min="0.5" max="3" step="0.1" value={commaPause} onChange={(event) => setCommaPause(Number(event.target.value))} aria-label="Punctuation pause multiplier" /></label>
              <div className="font-setting"><span>Font scale</span><div className="scale-control"><button onClick={() => updatePreferences((current) => ({ fontScale: current.fontScale - 0.05 }))} aria-label="Decrease font scale">−</button><span>Aa</span><button onClick={() => updatePreferences((current) => ({ fontScale: current.fontScale + 0.05 }))} aria-label="Increase font scale">+</button></div></div>
            </section>
          </section>
        </div>
        <footer className="reader-footer"><span>STEPPR ENGINE <i /> DEVICE-LOCAL</span><span>WPM {preferences.wpm} <i /> {mode === "fast" ? "FAST MODE" : "SENTENCE BREATHING"}</span></footer>
      </section>
      {showAchievement && <div className="achievement-layer" role="dialog" aria-modal="true" aria-labelledby="achievement-title"><div className="achievement-card"><button className="achievement-close" onClick={() => setShowAchievement(false)} aria-label="Close achievement card"><X size={18} /></button><div className="achievement-mark"><Sparkles size={24} /></div><span className="eyebrow">SESSION COMPLETE</span><h2 id="achievement-title">Your pace held.</h2><p>The local session is complete. Nothing was uploaded or shared.</p><div className="achievement-stats"><span><b>{preferences.wpm}</b><small>Peak WPM</small></span><span><b>1,468</b><small>Words read</small></span><span><b>4</b><small>Day streak</small></span></div><button className="achievement-reset" onClick={resetReader}><Check size={16} /> Start a new pass</button></div></div>}
      <AccessibilityDrawer open={isAccessibilityOpen} onClose={() => setAccessibilityOpen(false)} preferences={preferences} updatePreferences={updatePreferences} />
    </main>
  );
}
