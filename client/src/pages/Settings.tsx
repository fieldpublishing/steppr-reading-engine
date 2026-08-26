/** Instrument Panel design system: focused device-local settings limited to display theme and global reading scale. */
import { Check, Palette, Type } from "lucide-react";
import AppFrame from "@/components/AppFrame";
import { useReaderPreferences, type StepprTheme } from "@/hooks/useReaderPreferences";

const themes: Array<{ id: StepprTheme; name: string; note: string }> = [
  { id: "dark", name: "Zenith Dark", note: "Deep slate" },
  { id: "light", name: "Crisp Light", note: "Clean white" },
  { id: "oled", name: "OLED Black", note: "True black" },
  { id: "amber", name: "Amber CRT", note: "Warm phosphor" },
  { id: "terminal", name: "Green Terminal", note: "Signal green" },
  { id: "sepia", name: "Sepia", note: "Soft parchment" },
  { id: "solarized", name: "Solarized Paper", note: "Balanced contrast" },
  { id: "paper", name: "Warm Paper", note: "Low glare" },
  { id: "matrix", name: "Retro Matrix", note: "Retro matrix" },
];

export default function Settings() {
  const { preferences, updatePreferences } = useReaderPreferences();
  return <AppFrame title="Settings — display"><section className="page-heading"><div><span className="eyebrow">DISPLAY SETTINGS</span><h1>Set the reader surface.</h1><p>Theme and global type scale are saved in this browser and applied throughout Steppr.</p></div><span className="settings-status"><Check size={15} /> Saved locally</span></section><section className="settings-panel settings-panel--focused"><div className="settings-section-title"><Palette size={18} /><div><h2>Theme</h2><p>Choose the reading environment that is most comfortable for this device.</p></div></div><div className="theme-grid">{themes.map((theme) => <button key={theme.id} className={`theme-choice theme-choice--${theme.id} ${preferences.theme === theme.id ? "active" : ""}`} onClick={() => updatePreferences({ theme: theme.id })}><i /><span><b>{theme.name}</b><small>{theme.note}</small></span>{preferences.theme === theme.id && <Check size={15} />}</button>)}</div><div className="settings-section-title settings-section-title--spacing"><Type size={18} /><div><h2>Global font scale</h2><p>Change the reading size everywhere without changing the current WPM.</p></div></div><label className="settings-range"><span>Font scale <b>{Math.round(preferences.fontScale * 100)}%</b></span><input type="range" min="0.85" max="1.4" step="0.05" value={preferences.fontScale} onChange={(event) => updatePreferences({ fontScale: Number(event.target.value) })} /></label><div className="settings-disclaimer"><b>Device-local setting</b><p>Theme and font scale are stored only in this browser. They apply to the dashboard, reader, library, testing lab, analytics, and settings views.</p></div></section></AppFrame>;
}
