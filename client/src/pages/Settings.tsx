/** Instrument Panel design system: tabbed device-local controls for display, access, audio, privacy, and shortcuts. */
import { Accessibility, Check, Database, Download, FileUp, Keyboard, Palette, Play, RefreshCw, ShieldAlert, ShieldCheck, SlidersHorizontal, Square, Trash2, Type, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AppFrame from "@/components/AppFrame";
import { useReaderPreferences, type ReaderTypeface, type StepprTheme } from "@/hooks/useReaderPreferences";
import { createFullArchive, createMetricsExport, downloadJson, formatBytes, getStorageSnapshot, readAndMergeArchive, type StorageSnapshot } from "@/lib/dataPortability";
import { deleteLocalDatabase } from "@/lib/localStore";

type SettingsTab = "display" | "accessibility" | "audio" | "privacy" | "shortcuts";

const themes: Array<{ id: StepprTheme; name: string; note: string }> = [
  { id: "dark", name: "Zenith Dark", note: "Deep slate" }, { id: "light", name: "Crisp Light", note: "Clean white" }, { id: "oled", name: "OLED Black", note: "True black" }, { id: "amber", name: "Amber CRT", note: "Warm phosphor" }, { id: "terminal", name: "Green Terminal", note: "Signal green" }, { id: "sepia", name: "Sepia", note: "Soft parchment" }, { id: "solarized", name: "Solarized Paper", note: "Balanced contrast" }, { id: "paper", name: "Warm Paper", note: "Low glare" }, { id: "matrix", name: "Retro Matrix", note: "Retro matrix" },
];

const typefaces: Array<{ id: ReaderTypeface; name: string; note: string }> = [
  { id: "dyslexic", name: "OpenDyslexic", note: "Dyslexia-friendly when installed" }, { id: "atkinson", name: "Atkinson Hyperlegible", note: "Distinct letterforms when installed" }, { id: "system", name: "System Sans", note: "Native device readability" }, { id: "mono", name: "Monospace", note: "Fixed-width reading grid" },
];

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Palette }> = [
  { id: "display", label: "Display", icon: Palette }, { id: "accessibility", label: "Accessibility", icon: Accessibility }, { id: "audio", label: "Audio", icon: Volume2 }, { id: "privacy", label: "Data & Privacy", icon: ShieldCheck }, { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
];

const LegalNotice = () => <div className="settings-legal"><b>Functional Disclaimer & Legal Notice</b><p>Steppr provides user-configurable visual and temporal display controls to assist with personal reading comfort. Steppr is not a certified assistive technology, medical device, or diagnostic tool. It does not replace prescribed screen readers, specialized vision aids, or educational accommodations. No personal disability or preference data is tracked, stored remotely, or transmitted.</p></div>;

function DisplayTab() {
  const { preferences, updatePreferences } = useReaderPreferences();
  return <div className="settings-stack"><div className="settings-section-title"><Palette size={18} /><div><h2>Display surface</h2><p>Choose the reading environment that is most comfortable for this device.</p></div></div><div className="theme-grid">{themes.map((theme) => <button key={theme.id} className={`theme-choice theme-choice--${theme.id} ${preferences.theme === theme.id ? "active" : ""}`} onClick={() => updatePreferences({ theme: theme.id })}><i /><span><b>{theme.name}</b><small>{theme.note}</small></span>{preferences.theme === theme.id && <Check size={15} />}</button>)}</div><div className="settings-section-title settings-section-title--spacing"><Type size={18} /><div><h2>Global font scale</h2><p>Apply a reading size throughout the dashboard and reader without changing WPM.</p></div></div><label className="settings-range"><span>Font scale <b>{Math.round(preferences.fontScale * 100)}%</b></span><input type="range" min="0.85" max="1.4" step="0.05" value={preferences.fontScale} onChange={(event) => updatePreferences({ fontScale: Number(event.target.value) })} /></label></div>;
}

function AccessibilityTab() {
  const { preferences, updatePreferences } = useReaderPreferences();
  return <div className="settings-stack"><div className="settings-section-title"><Accessibility size={18} /><div><h2>Reading accessibility</h2><p>Typography and visual-density choices apply locally across the reader.</p></div></div><h3 className="settings-subtitle">Typeface</h3><div className="typeface-grid">{typefaces.map((typeface) => <button key={typeface.id} className={`typeface-choice typeface-choice--${typeface.id} ${preferences.typeface === typeface.id ? "active" : ""}`} onClick={() => updatePreferences({ typeface: typeface.id })}><span><b>{typeface.name}</b><small>{typeface.note}</small></span>{preferences.typeface === typeface.id && <Check size={15} />}</button>)}</div><div className="accessibility-sliders"><label className="settings-range"><span>Letter spacing <b>{preferences.letterSpacing.toFixed(2)}em</b></span><input type="range" min="0" max="0.16" step="0.01" value={preferences.letterSpacing} onChange={(event) => updatePreferences({ letterSpacing: Number(event.target.value) })} /></label><label className="settings-range"><span>Line height <b>{preferences.lineSpacing.toFixed(2)}×</b></span><input type="range" min="1.25" max="2.1" step="0.05" value={preferences.lineSpacing} onChange={(event) => updatePreferences({ lineSpacing: Number(event.target.value) })} /></label><label className="settings-range"><span>Paragraph gap <b>{preferences.paragraphGap.toFixed(1)}em</b></span><input type="range" min="0.4" max="2.5" step="0.1" value={preferences.paragraphGap} onChange={(event) => updatePreferences({ paragraphGap: Number(event.target.value) })} /></label></div><label className="settings-switch"><span><SlidersHorizontal size={17} /><i><b>High contrast mode</b><small>Enhanced black, white, cyan, and amber palette for at least 7:1 text contrast.</small></i></span><input type="checkbox" checked={preferences.highContrast} onChange={(event) => updatePreferences({ highContrast: event.target.checked })} /><em /></label><label className="settings-switch"><span><Accessibility size={17} /><i><b>Reduce motion</b><small>Removes non-essential motion and transitions.</small></i></span><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => updatePreferences({ reducedMotion: event.target.checked })} /><em /></label><LegalNotice /></div>;
}

function AudioTab() {
  const { preferences, updatePreferences } = useReaderPreferences();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => {
    if (!supported) return;
    const syncVoices = () => setVoices(window.speechSynthesis.getVoices());
    syncVoices();
    window.speechSynthesis.addEventListener("voiceschanged", syncVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", syncVoices);
  }, [supported]);
  const voiceRate = preferences.ttsLockToWpm ? Math.min(2, Math.max(0.5, preferences.wpm / 450)) : preferences.ttsRate;
  const previewVoice = () => {
    if (!supported) return;
    const utterance = new SpeechSynthesisUtterance("Steppr voice preview. This speech stays in your browser.");
    const voice = voices.find((item) => item.voiceURI === preferences.ttsVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = voiceRate;
    utterance.pitch = preferences.ttsPitch;
    utterance.volume = preferences.ttsVolume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  return <div className="settings-stack"><div className="settings-section-title"><Volume2 size={18} /><div><h2>Audio & text-to-speech</h2><p>Uses the browser Web Speech API and local system voices. No external speech service is called.</p></div></div>{!supported ? <div className="settings-coming"><Volume2 size={21} /><div><b>Speech is unavailable in this browser.</b><p>Choose a browser with the Web Speech API enabled to use local voice playback.</p></div></div> : <><label className="settings-switch"><span><Volume2 size={17} /><i><b>Voice follow</b><small>Speak each active ORP focus word while the reader plays.</small></i></span><input type="checkbox" checked={preferences.ttsEnabled} onChange={(event) => updatePreferences({ ttsEnabled: event.target.checked })} /><em /></label><label className="settings-select"><span>System voice</span><select value={preferences.ttsVoice} onChange={(event) => updatePreferences({ ttsVoice: event.target.value })}><option value="">Browser default voice</option>{voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} — {voice.lang}</option>)}</select><small>{voices.length ? `${voices.length} local voice${voices.length === 1 ? "" : "s"} detected` : "Waiting for local voices…"}</small></label><label className="settings-switch"><span><SlidersHorizontal size={17} /><i><b>Lock TTS speed to current WPM</b><small>Current reader pace resolves to {voiceRate.toFixed(2)}× speech speed.</small></i></span><input type="checkbox" checked={preferences.ttsLockToWpm} onChange={(event) => updatePreferences({ ttsLockToWpm: event.target.checked })} /><em /></label>{!preferences.ttsLockToWpm && <label className="settings-range"><span>Speech speed <b>{preferences.ttsRate.toFixed(2)}×</b></span><input type="range" min="0.5" max="2" step="0.05" value={preferences.ttsRate} onChange={(event) => updatePreferences({ ttsRate: Number(event.target.value) })} /></label>}<div className="audio-slider-grid"><label className="settings-range"><span>Pitch <b>{preferences.ttsPitch.toFixed(2)}×</b></span><input type="range" min="0.5" max="2" step="0.05" value={preferences.ttsPitch} onChange={(event) => updatePreferences({ ttsPitch: Number(event.target.value) })} /></label><label className="settings-range"><span>Volume <b>{Math.round(preferences.ttsVolume * 100)}%</b></span><input type="range" min="0" max="1" step="0.05" value={preferences.ttsVolume} onChange={(event) => updatePreferences({ ttsVolume: Number(event.target.value) })} /></label></div><div className="audio-actions"><button className="secondary-cta" onClick={previewVoice}><Play size={15} /> Test local voice</button><button className="secondary-cta" onClick={() => window.speechSynthesis.cancel()}><Square size={14} /> Stop</button></div></>}</div>;
}

function PrivacyTab() {
  const { preferences, updatePreferences } = useReaderPreferences();
  const [snapshot, setSnapshot] = useState<StorageSnapshot>();
  const [persistent, setPersistent] = useState<boolean>();
  const [notice, setNotice] = useState("");
  const [isWorking, setWorking] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const refresh = async () => {
    try {
      const [nextSnapshot, persisted] = await Promise.all([getStorageSnapshot(preferences), navigator.storage?.persisted?.() ?? Promise.resolve(false)]);
      setSnapshot(nextSnapshot);
      setPersistent(persisted);
    } catch { setNotice("This browser does not currently expose storage details."); }
  };
  useEffect(() => { refresh(); }, [preferences]);
  const grantPersistentStorage = async () => {
    if (!navigator.storage?.persist) { setNotice("Persistent storage requests are unavailable in this browser."); return; }
    const granted = await navigator.storage.persist();
    setPersistent(granted);
    setNotice(granted ? "Persistent browser storage granted." : "Persistent storage was not granted by this browser.");
  };
  const exportMetrics = async () => { setWorking(true); try { downloadJson(await createMetricsExport(preferences), "steppr-preferences-metrics.json"); setNotice("Preferences and metrics export prepared locally."); } finally { setWorking(false); } };
  const exportArchive = async () => { setWorking(true); try { downloadJson(await createFullArchive(preferences), "steppr-full-local-archive.json"); setNotice("Full local archive export prepared, including available documents."); } finally { setWorking(false); } };
  const importArchive = async (file: File | undefined) => { if (!file) return; setWorking(true); try { const result = await readAndMergeArchive(file); if (result.preferences) updatePreferences(result.preferences); setNotice(`Local archive merged. ${result.importedDocuments} document${result.importedDocuments === 1 ? "" : "s"} restored.`); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "The local archive could not be imported."); } finally { setWorking(false); if (importInput.current) importInput.current.value = ""; } };
  const purge = async () => { if (!window.confirm("Purge all Steppr documents, sessions, metrics, and browser-local preferences? This cannot be undone.")) return; setWorking(true); try { await deleteLocalDatabase(); ["steppr.reader.preferences.v1", "steppr.reader.preferences.v2", "steppr.reader.session.v1"].forEach((key) => window.localStorage.removeItem(key)); window.location.reload(); } catch (error) { setNotice(error instanceof Error ? error.message : "Local data could not be purged."); setWorking(false); } };
  return <div className="settings-stack"><div className="settings-section-title"><ShieldCheck size={18} /><div><h2>Data & privacy</h2><p>Storage, portability, and deletion controls remain confined to this browser.</p></div></div>{notice && <div className="inline-notice"><span>{notice}</span><button onClick={() => setNotice("")}>Dismiss</button></div>}<section className="storage-card"><div className="storage-card__heading"><div><Database size={18} /><span><b>Local storage usage</b><small>{snapshot?.browserUsage !== undefined ? `${formatBytes(snapshot.browserUsage)} used of ${formatBytes(snapshot.browserQuota)}` : "Browser estimate unavailable"}</small></span></div><button className="secondary-cta" onClick={refresh}><RefreshCw size={14} /> Refresh</button></div><div className="storage-grid"><span><b>{formatBytes(snapshot?.libraryBytes)}</b><small>Library files</small></span><span><b>{formatBytes(snapshot?.metricsBytes)}</b><small>Session metrics</small></span><span><b>{formatBytes(snapshot?.preferenceBytes)}</b><small>Preferences</small></span></div><div className="storage-persistence"><span><i className={persistent ? "active" : ""} /> {persistent ? "Persistent storage granted" : "Persistent storage not granted"}</span><button className="secondary-cta" disabled={persistent || isWorking} onClick={grantPersistentStorage}>Grant Persistent Storage</button></div></section><section className="privacy-notice-grid"><article><b>ZERO TELEMETRY</b><p>No analytics or tracking scripts.</p></article><article><b>NO ACCOUNT REQUIRED</b><p>Entirely local application.</p></article><article><b>FILE RETENTION</b><p>Files isolated to browser IndexedDB context.</p></article><article><b>THIRD-PARTY ISOLATION</b><p>Pacing and calculations run entirely on client-side JS.</p></article></section><section className="portability-card"><div><h3>Local data portability</h3><p>Exports are generated by this browser. Imports merge valid Steppr archive data locally.</p></div><div className="portability-actions"><button className="secondary-cta" disabled={isWorking} onClick={exportMetrics}><Download size={15} /> Export Preferences & Metrics</button><button className="secondary-cta" disabled={isWorking} onClick={exportArchive}><Download size={15} /> Export Full Archive</button><button className="secondary-cta" disabled={isWorking} onClick={() => importInput.current?.click()}><FileUp size={15} /> Import JSON</button><input ref={importInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => importArchive(event.target.files?.[0])} /></div></section><section className="danger-zone"><div><ShieldAlert size={19} /><span><b>Danger zone</b><p>Purge all local documents, sessions, metrics, and preferences from this browser.</p></span></div><button disabled={isWorking} onClick={purge}><Trash2 size={15} /> Purge All Local Data</button></section></div>;
}

function ShortcutsTab() { return <div className="settings-stack"><div className="settings-section-title"><Keyboard size={18} /><div><h2>Reader shortcuts</h2><p>Keyboard control remains available while the reader is open.</p></div></div><div className="shortcut-list"><span><kbd>SPACE</kbd><b>Play / pause</b></span><span><kbd>↑</kbd><kbd>↓</kbd><b>Adjust WPM by 25</b></span><span><kbd>←</kbd><kbd>→</kbd><b>Previous / next sentence</b></span><span><kbd>M</kbd><b>Toggle triple-mirror display</b></span></div></div>; }

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("display");
  return <AppFrame title="Settings — device-local"><section className="page-heading"><div><span className="eyebrow">ADVANCED SETTINGS</span><h1>Make the reader yours.</h1><p>Every setting runs and persists in this browser. No account is required.</p></div><span className="settings-status"><Check size={15} /> Saved locally</span></section><section className="settings-workspace"><nav className="settings-tabbar" aria-label="Settings sections">{tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}><Icon size={16} /> {tab.label}</button>; })}</nav><section className="settings-panel settings-panel--tabbed">{activeTab === "display" && <DisplayTab />}{activeTab === "accessibility" && <AccessibilityTab />}{activeTab === "audio" && <AudioTab />}{activeTab === "privacy" && <PrivacyTab />}{activeTab === "shortcuts" && <ShortcutsTab />}</section></section></AppFrame>;
}
