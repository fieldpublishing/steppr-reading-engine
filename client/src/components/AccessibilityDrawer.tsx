/**
 * Instrument Panel design system: quick, functional accessibility choices with local persistence.
 * Profile labels describe outcomes rather than diagnostic identities.
 */
import { AlertTriangle, Contrast, Eye, Focus, Gauge, Type, X } from "lucide-react";
import type { ReaderPreferences } from "@/hooks/useReaderPreferences";

type AccessibilityDrawerProps = {
  open: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  updatePreferences: (update: Partial<ReaderPreferences> | ((current: ReaderPreferences) => Partial<ReaderPreferences>)) => void;
};

export default function AccessibilityDrawer({ open, onClose, preferences, updatePreferences }: AccessibilityDrawerProps) {
  if (!open) return null;
  return (
    <div className="accessibility-layer" role="dialog" aria-modal="true" aria-labelledby="accessibility-title">
      <button className="accessibility-scrim" onClick={onClose} aria-label="Close accessibility controls" />
      <aside className="accessibility-drawer">
        <header className="drawer-header"><div><span className="eyebrow">LOCAL PREFERENCES</span><h2 id="accessibility-title">Accessibility</h2></div><button className="global-icon-button" onClick={onClose} aria-label="Close accessibility controls"><X size={19} /></button></header>
        <p className="drawer-intro">These device-local controls adjust only this browser. They do not diagnose, collect, or transmit personal information. Not a certified assistive technology or diagnostic tool.</p>
        <div className="quick-profile-grid">
          <button className="quick-profile" onClick={() => updatePreferences({ theme: "oled", highContrast: true, fontScale: 1.2, reducedMotion: true })}><Contrast size={18} /><span><b>High Contrast</b><small>OLED black, larger text, reduced motion</small></span></button>
          <button className="quick-profile" onClick={() => updatePreferences({ fontScale: 1.12, letterSpacing: 0.06, lineSpacing: 1.85, reducedMotion: true, wpm: 650 })}><Focus size={18} /><span><b>Focus Mode</b><small>Spacious type, calmer pace, quiet motion</small></span></button>
        </div>
        <section className="drawer-section"><div className="drawer-section__title"><Eye size={16} /> Contrast & motion</div>
          <label className="drawer-switch"><span>High contrast</span><input type="checkbox" checked={preferences.highContrast} onChange={(event) => updatePreferences({ highContrast: event.target.checked })} /><i /></label>
          <label className="drawer-switch"><span>Reduce motion</span><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => updatePreferences({ reducedMotion: event.target.checked })} /><i /></label>
        </section>
        <section className="drawer-section"><div className="drawer-section__title"><Type size={16} /> Reading density</div>
          <label className="drawer-range"><span>Letter spacing <b>{Math.round(preferences.letterSpacing * 100)}%</b></span><input type="range" min="0" max="0.16" step="0.01" value={preferences.letterSpacing} onChange={(event) => updatePreferences({ letterSpacing: Number(event.target.value) })} /></label>
          <label className="drawer-range"><span>Line spacing <b>{preferences.lineSpacing.toFixed(2)}×</b></span><input type="range" min="1.25" max="2.1" step="0.05" value={preferences.lineSpacing} onChange={(event) => updatePreferences({ lineSpacing: Number(event.target.value) })} /></label>
          <label className="drawer-range"><span>Paragraph gap <b>{preferences.paragraphGap.toFixed(1)}em</b></span><input type="range" min="0.4" max="2.5" step="0.1" value={preferences.paragraphGap} onChange={(event) => updatePreferences({ paragraphGap: Number(event.target.value) })} /></label>
        </section>
        <section className="drawer-section drawer-section--notice"><AlertTriangle size={16} /><div><b>Functional Disclaimer & Legal Notice</b><p>Steppr provides user-configurable visual and temporal display controls to assist with personal reading comfort. Steppr is not a certified assistive technology, medical device, or diagnostic tool. It does not replace prescribed screen readers, specialized vision aids, or educational accommodations. No personal disability or preference data is tracked, stored remotely, or transmitted.</p></div></section>
        <section className="drawer-section drawer-section--note"><Gauge size={16} /><p>Every control remains available from Settings. Keyboard focus is visibly outlined throughout the console.</p></section>
      </aside>
    </div>
  );
}
