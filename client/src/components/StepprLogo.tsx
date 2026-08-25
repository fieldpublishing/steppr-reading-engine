/**
 * Instrument Panel design system: a background-free, native rendering of the
 * supplied Steppr Tech arrangement for perfectly seamless header integration.
 */
type StepprLogoProps = {
  theme: "dark" | "light";
};

export default function StepprLogo({ theme }: StepprLogoProps) {
  return (
    <div className={`steppr-logo steppr-logo--${theme}`} aria-label="Steppr Tech">
      <span className="steppr-logo__book" aria-hidden="true"><i /></span>
      <span className="steppr-logo__name"><b>STEPPR.</b><em>TECH</em></span>
    </div>
  );
}
