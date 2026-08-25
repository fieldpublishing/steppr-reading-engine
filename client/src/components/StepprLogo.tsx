/**
 * Instrument Panel design system: canonical Steppr Tech brand asset presented
 * as a compact, high-contrast equipment mark in the reader header.
 */
type StepprLogoProps = {
  theme: "dark" | "light";
};

export default function StepprLogo({ theme }: StepprLogoProps) {
  return (
    <div className={`steppr-logo steppr-logo--${theme}`} aria-label="Steppr Tech">
      <img src="/manus-storage/steppr-tech-logo_695328b3.png" alt="STEPPR. TECH" />
    </div>
  );
}
