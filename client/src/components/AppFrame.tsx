/**
 * Instrument Panel design system: shared local-first application frame for non-reader routes.
 * Every view shares the same device-local preferences, navigation, and accessibility drawer.
 */
import { useState, type ReactNode } from "react";
import AccessibilityDrawer from "@/components/AccessibilityDrawer";
import GlobalHeader from "@/components/GlobalHeader";
import { useReaderPreferences } from "@/hooks/useReaderPreferences";

type AppFrameProps = {
  title: string;
  children: ReactNode;
};

export default function AppFrame({ title, children }: AppFrameProps) {
  const { preferences, updatePreferences } = useReaderPreferences();
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const typeface = { system: '"DM Sans", Arial, sans-serif', atkinson: '"Atkinson Hyperlegible", Arial, sans-serif', dyslexic: '"OpenDyslexic", "Comic Sans MS", sans-serif', mono: 'ui-monospace, "SFMono-Regular", Consolas, monospace' }[preferences.typeface];
  const backgroundImage = "none";

  return (
    <main className={`steppr-app theme-${preferences.theme} ${preferences.highContrast ? "high-contrast" : ""} ${preferences.reducedMotion ? "motion-reduced" : ""}`} style={{ "--steppr-field": backgroundImage, "--reader-letter-spacing": `${preferences.letterSpacing}em`, "--reader-line-height": preferences.lineSpacing, "--reader-paragraph-gap": `${preferences.paragraphGap}em`, "--reader-font-family": typeface } as React.CSSProperties}>
      <GlobalHeader title={title} preferences={preferences} updatePreferences={updatePreferences} onOpenAccessibility={() => setAccessibilityOpen(true)} />
      <div className="app-frame"><div className="app-frame__inner">{children}<footer className="app-local-footer">Designed as a non-medical reading tool. Steppr provides functional reading controls only.</footer></div></div>
      <AccessibilityDrawer open={accessibilityOpen} onClose={() => setAccessibilityOpen(false)} preferences={preferences} updatePreferences={updatePreferences} />
    </main>
  );
}
