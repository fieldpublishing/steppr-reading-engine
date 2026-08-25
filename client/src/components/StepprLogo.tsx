/**
 * Instrument Panel design system: transparent Steppr Tech lockup that carries
 * the supplied folded-book silhouette without the original raster background.
 */
type StepprLogoProps = {
  theme: "dark" | "light";
};

export default function StepprLogo({ theme }: StepprLogoProps) {
  return (
    <div className={`steppr-logo steppr-logo--${theme}`} aria-label="Steppr Tech">
      <span className="steppr-logo__mark" aria-hidden="true"><i /></span>
      <span className="steppr-logo__type"><b>STEPPR.</b><em>TECH</em></span>
    </div>
  );
}
