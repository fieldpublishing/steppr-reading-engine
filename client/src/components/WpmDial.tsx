/**
 * Instrument Panel design system: tactile speed control with a precise,
 * low-distraction dial and a prominent tabular metric readout.
 */
import { Minus, Plus } from "lucide-react";
import type { WheelEvent } from "react";

type WpmDialProps = {
  wpm: number;
  onChange: (value: number) => void;
};

const clamp = (value: number) => Math.min(2500, Math.max(100, value));

export default function WpmDial({ wpm, onChange }: WpmDialProps) {
  const dialProgress = ((wpm - 100) / 2400) * 270;

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    onChange(clamp(wpm + (event.deltaY > 0 ? -25 : 25)));
  };

  return (
    <section className="control-bay pacing-bay" aria-label="Reading pace controls">
      <div className="bay-label">Pacing</div>
      <div className="pacing-layout">
        <div
          className="wpm-dial"
          onWheel={handleWheel}
          role="slider"
          tabIndex={0}
          aria-label="Words per minute"
          aria-valuemin={100}
          aria-valuemax={2500}
          aria-valuenow={wpm}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowRight") {
              event.preventDefault();
              onChange(clamp(wpm + 25));
            }
            if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
              event.preventDefault();
              onChange(clamp(wpm - 25));
            }
          }}
          style={{ "--dial-fill": `${dialProgress}deg` } as React.CSSProperties}
        >
          <div className="dial-core"><span /></div>
          <div className="dial-tick" />
          <span className="dial-min">100</span>
          <span className="dial-max">2500</span>
        </div>
        <div className="wpm-readout" aria-live="polite">
          <div className="wpm-number">{wpm}</div>
          <div className="wpm-unit">WPM</div>
          <div className="wpm-stepper" aria-label="Fine tune reading pace">
            <button onClick={() => onChange(clamp(wpm - 25))} aria-label="Decrease words per minute"><Minus size={13} /></button>
            <button onClick={() => onChange(clamp(wpm + 25))} aria-label="Increase words per minute"><Plus size={13} /></button>
          </div>
        </div>
      </div>
      <input
        className="visually-hidden"
        type="range"
        min="100"
        max="2500"
        step="25"
        value={wpm}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="WPM range input"
      />
      <p className="bay-hint">Scroll or use arrow keys</p>
    </section>
  );
}
