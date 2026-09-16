/** Instrument Panel design system: live local-status console with no preview metrics or remote telemetry. */
import { ArrowUpRight, BookOpen, CalendarDays, Clock3, Flame, Gauge, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import AppFrame from "@/components/AppFrame";
import { formatFinishEstimate, formatFocusTime, getAnalyticsSnapshot, type AnalyticsSnapshot } from "@/lib/analytics";
import { LOCAL_DATA_CHANGED_EVENT } from "@/lib/localStore";

const emptySnapshot: AnalyticsSnapshot = {
  wordsRead: 0,
  activeDays: 0,
  focusSeconds: 0,
  averageWpm: 0,
  weeklyVolume: [],
  monthlyPace: [],
  remainingWords: 0,
  finishSeconds: 0,
  documents: [],
  sessions: [],
};

const formatAggregate = (value: string | number, loading: boolean) => loading ? "…" : value;

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>();

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await getAnalyticsSnapshot();
        if (active) {
          setSnapshot(next);
          setLastUpdated(Date.now());
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    const handleLocalDataChange = () => { void refresh(); };
    void refresh();
    window.addEventListener(LOCAL_DATA_CHANGED_EVENT, handleLocalDataChange);
    window.addEventListener("focus", handleLocalDataChange);
    const interval = window.setInterval(handleLocalDataChange, 15_000);
    return () => {
      active = false;
      window.removeEventListener(LOCAL_DATA_CHANGED_EVENT, handleLocalDataChange);
      window.removeEventListener("focus", handleLocalDataChange);
      window.clearInterval(interval);
    };
  }, []);

  const activeDocument = snapshot.documents.find((document) => document.parseStatus === "ready" && document.progress < 100);
  const remainingWords = activeDocument ? Math.max(0, Math.round(activeDocument.wordCount * (1 - activeDocument.progress / 100))) : 0;
  const documentHref = activeDocument ? `/pacing-engine?document=${encodeURIComponent(activeDocument.id)}` : "/library";
  const progress = activeDocument?.progress ?? 0;
  const weekWords = snapshot.weeklyVolume.reduce((total, day) => total + day.words, 0);
  const maxWeekly = Math.max(1, ...snapshot.weeklyVolume.map((day) => day.words));
  const metricCards = useMemo(() => [
    { icon: Gauge, label: "AVERAGE SESSION PACE", value: snapshot.averageWpm ? `${snapshot.averageWpm}` : "—", unit: snapshot.averageWpm ? "WPM" : "", detail: "weighted local sessions", index: "01" },
    { icon: BookOpen, label: "WORDS COMPLETED", value: snapshot.wordsRead.toLocaleString(), unit: "", detail: `${snapshot.sessions.length} completed session${snapshot.sessions.length === 1 ? "" : "s"}`, index: "02" },
    { icon: Clock3, label: "FOCUS TIME", value: formatFocusTime(snapshot.focusSeconds), unit: "", detail: "completed local sessions", index: "03" },
    { icon: Flame, label: "ACTIVE DAYS", value: `${snapshot.activeDays}`, unit: "OF 7", detail: "current calendar week", index: "04" },
  ], [snapshot]);

  return <AppFrame title="Dashboard — local session"><div className="dashboard-console"><section className="page-heading dashboard-heading"><div><span className="eyebrow">DEVICE-LOCAL / LIVE AGGREGATES</span><h1>{loading ? "Reading data loading." : snapshot.sessions.length ? "Reading session live." : "No reading sessions yet."}</h1><p>Every reading below is calculated from completed IndexedDB sessions and local documents on this device.</p></div><div className="dashboard-heading__action"><span className="dashboard-focus-lock"><RefreshCw size={14} className={loading ? "spin" : ""} /> {lastUpdated ? "Live local data" : "Awaiting local data"}</span><Link href={documentHref} className="primary-cta"><Play size={16} fill="currentColor" /> {activeDocument ? "Resume document" : "Open library"}</Link></div></section><section className="metric-grid" aria-label="Live local reading aggregates">{metricCards.map(({ icon: Icon, label, value, unit, detail, index }) => <article key={label} className="instrument-readout"><div className="instrument-readout__head"><Icon size={17} /><span>{label}</span><i>{index}</i></div><b>{formatAggregate(value, loading)} {unit && <small>{unit}</small>}</b><em>{detail}</em></article>)}</section><section className="dashboard-grid"><article className={`resume-card resume-card--active ${activeDocument ? "" : "resume-card--empty"}`}><div className="resume-card__top"><span className="eyebrow">{activeDocument ? "ACTIVE DOCUMENT / HANDOFF" : "ACTIVE DOCUMENT / EMPTY"}</span><ShieldCheck size={17} /></div>{activeDocument ? <><div className="resume-card__position"><span>POSITION</span><b>{Math.round(progress).toString().padStart(3, "0")}%</b><i>{remainingWords.toLocaleString()} WORDS REMAIN</i></div><h2 title={activeDocument.name}>{activeDocument.name}</h2><p>{activeDocument.wordCount.toLocaleString()} words · local document</p><div className="document-progress"><span style={{ width: `${progress}%` }} /><i aria-hidden="true" style={{ left: `calc(${progress}% - 5px)` }} /></div><div className="resume-card__footer"><span>{snapshot.averageWpm ? formatFinishEstimate(snapshot.finishSeconds) : "Pace estimate pending"}</span><Link href={documentHref}>Resume sequence <ArrowUpRight size={14} /></Link></div></> : <div className="dashboard-empty"><h2>No active document</h2><p>Import a local document to create a live reading handoff.</p><Link href="/library" className="secondary-cta">Open library <ArrowUpRight size={14} /></Link></div>}</article><article className="velocity-card"><div><span className="eyebrow">SEVEN-DAY INPUT / LOCAL</span><h2>{weekWords ? "Live reading volume." : "Awaiting reading volume."}</h2></div>{weekWords ? <div className="preview-bars" aria-label="Live local reading activity"><div className="preview-bars__columns">{snapshot.weeklyVolume.map((day) => <span key={day.date} style={{ height: `${Math.max(day.words ? 8 : 2, day.words / maxWeekly * 100)}%` }} title={`${day.words.toLocaleString()} words on ${day.label}`} />)}</div><div className="preview-bars__labels">{snapshot.weeklyVolume.map((day) => <span key={day.date}>{day.label.slice(0, 1)}</span>)}</div></div> : <p className="chart-empty">Complete a local reader session to populate this week.</p>}</article></section><section className="privacy-panel"><ShieldCheck size={21} /><div><b>DEVICE-LOCAL STATUS / LIVE</b><p>{snapshot.sessions.length ? `${snapshot.sessions.length} completed local session${snapshot.sessions.length === 1 ? " is" : "s are"} informing this dashboard.` : "No session data has been recorded yet. Nothing is estimated or fabricated."}</p></div><span className="dashboard-updated"><CalendarDays size={13} /> {lastUpdated ? "Auto-refresh 15s" : "Awaiting data"}</span></section></div></AppFrame>;
}
