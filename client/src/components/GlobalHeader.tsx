/**
 * Instrument Panel design system: universal navigation and accessible device-local controls.
 * The header keeps every local-first workspace in reach without distracting from the reader.
 */
import { Accessibility, ChevronRight, CloudOff, FileBarChart, FlaskConical, LayoutDashboard, LibraryBig, LockKeyhole, Menu, MoonStar, PanelTop, Settings2, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import type { ReaderPreferences } from "@/hooks/useReaderPreferences";
import StepprLogo from "@/components/StepprLogo";
import { listLocalDocuments } from "@/lib/localStore";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pacing-engine", label: "Pacing Engine", icon: PanelTop },
  { href: "/library", label: "Library", icon: LibraryBig },
  { href: "/testing-lab", label: "Testing Lab", icon: FlaskConical },
  { href: "/analytics", label: "Analytics", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

type GlobalHeaderProps = {
  title?: string;
  preferences: ReaderPreferences;
  updatePreferences: (update: Partial<ReaderPreferences> | ((current: ReaderPreferences) => Partial<ReaderPreferences>)) => void;
  onOpenAccessibility: () => void;
  onOpenMenu?: () => void;
};

export default function GlobalHeader({ title = "Atomic Habits — Chapter 1", preferences, updatePreferences, onOpenAccessibility, onOpenMenu }: GlobalHeaderProps) {
  const [location] = useLocation();
  const isDark = ["dark", "oled", "amber", "terminal", "matrix"].includes(preferences.theme);
  const isLight = !isDark;
  const [localDocumentCount, setLocalDocumentCount] = useState<number>();

  useEffect(() => {
    let active = true;
    listLocalDocuments().then((documents) => { if (active) setLocalDocumentCount(documents.length); }).catch(() => { if (active) setLocalDocumentCount(undefined); });
    return () => { active = false; };
  }, [location]);

  return (
    <header className="global-header">
      <div className="global-header__top">
        <div className="global-header__brand">
          <button className="global-icon-button global-menu-button" onClick={onOpenMenu} aria-label="Open navigation"><Menu size={19} /></button>
          <Link href="/" className="global-logo-link"><StepprLogo theme={isDark ? "dark" : "light"} /></Link>
        </div>
        <div className="global-document-title"><span>{title}</span></div>
        <div className="global-header__actions">
          <button className="appearance-toggle" onClick={() => updatePreferences({ theme: isLight ? "dark" : "light" })} aria-label="Toggle light and dark theme">
            {isLight ? <MoonStar size={17} /> : <SunMedium size={17} />}<span>{isLight ? "Dark" : "Light"}</span>
          </button>
          <button className="accessibility-button" onClick={onOpenAccessibility}><Accessibility size={17} /><span>Accessibility</span></button>
          <div className="global-profile" aria-label="Local profile">ST</div>
        </div>
      </div>
      <nav className="global-nav" aria-label="Primary navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return <Link key={href} href={href} className={`global-nav__link ${active ? "is-active" : ""}`}><Icon size={15} /><span>{label}</span>{active && <ChevronRight size={13} />}</Link>;
        })}
        <span className="privacy-badge privacy-badge--cloud"><CloudOff size={13} /> 0 Cloud Uploads</span>
        <span className="privacy-badge"><LockKeyhole size={12} /> {localDocumentCount === undefined ? "Private by Default" : `Private by Default · ${localDocumentCount} local`}</span>
      </nav>
    </header>
  );
}
